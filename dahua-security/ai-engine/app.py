"""
DAWA Security — AI Engine
Flask API + processing thread for intrusion detection (YOLOv8) and
facial recognition (InsightFace) on RTSP camera streams.
"""
import os
import io
import time
import json
import threading
import urllib.request
from datetime import datetime

import numpy as np
import cv2
from flask import Flask, request, jsonify
from flask_cors import CORS
from shapely.geometry import Point, Polygon

# ── Config ─────────────────────────────────────────────────
API_BASE = os.environ.get("API_BASE", "http://localhost:4000")
INTERNAL_KEY = os.environ.get("AI_SERVICE_TOKEN", "dahua-internal-2026")
SNAPSHOTS_DIR = os.environ.get("SNAPSHOTS_DIR", "/opt/dahua-enterprise/snapshots")
CONF_THRESHOLD = 0.45
FACE_SIM_THRESHOLD = 0.55  # cosine similarity threshold (1=exact)
DETECTION_INTERVAL = 2.0  # seconds between detection frames per camera
FRAME_WIDTH = 640

os.makedirs(SNAPSHOTS_DIR, exist_ok=True)

# ── Models (lazy-loaded) ────────────────────────────────────
_yolo = None
_face_app = None
_known_faces = []  # [{ name, embedding }]
_faces_lock = threading.Lock()
_faces_last_reload = 0


def get_yolo():
    global _yolo
    if _yolo is None:
        from ultralytics import YOLO
        _yolo = YOLO("yolov8n.pt")
    return _yolo


def get_face_app():
    global _face_app
    if _face_app is None:
        from insightface.app import FaceAnalysis
        _face_app = FaceAnalysis(name="buffalo_l")
        _face_app.prepare(ctx_id=-1, det_size=(640, 640))
    return _face_app


# ── Flask App ───────────────────────────────────────────────
app = Flask(__name__)
CORS(app)


@app.route("/health")
def health():
    return jsonify({"status": "ok", "models_loaded": _yolo is not None and _face_app is not None})


@app.route("/embed", methods=["POST"])
def embed():
    """Extract face embedding from an image URL."""
    data = request.get_json(silent=True) or {}
    image_url = data.get("image_url")
    if not image_url:
        if "file" in request.files:
            filebytes = request.files["file"].read()
        else:
            return jsonify({"error": "image_url or file required"}), 400
    else:
        try:
            with urllib.request.urlopen(image_url, timeout=10) as r:
                filebytes = r.read()
        except Exception as e:
            return jsonify({"error": f"cannot fetch image: {e}"}), 400

    img_array = np.frombuffer(filebytes, np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    if img is None:
        return jsonify({"error": "invalid image"}), 400

    try:
        fa = get_face_app()
        faces = fa.get(img)
    except Exception as e:
        return jsonify({"error": f"insightface error: {e}"}), 500

    if not faces:
        return jsonify({"embedding": [], "bbox": []}), 200

    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
    embedding = face.normed_embedding.tolist()
    bbox = face.bbox.tolist()
    return jsonify({"embedding": embedding, "bbox": bbox})


@app.route("/faces/reload", methods=["POST"])
def reload_faces():
    """Force reload of known faces from backend."""
    _reload_known_faces(force=True)
    return jsonify({"status": "reloaded", "count": len(_known_faces)})


# ── Known faces management ──────────────────────────────────
def _reload_known_faces(force=False):
    global _faces_last_reload, _known_faces
    now = time.time()
    if not force and now - _faces_last_reload < 60:
        return
    _faces_last_reload = now
    headers = {"X-Internal-Key": INTERNAL_KEY}
    try:
        req = urllib.request.Request(f"{API_BASE}/api/internal/faces", headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            faces_data = json.loads(r.read())
        with _faces_lock:
            _known_faces = []
            for f in faces_data:
                if f.get("embedding") and len(f["embedding"]) > 0:
                    emb = np.array(f["embedding"], dtype=np.float32)
                    _known_faces.append({"id": f["id"], "name": f["name"], "embedding": emb})
        print(f"[AI] Rostros conocidos cargados: {len(_known_faces)}", flush=True)
    except Exception as e:
        print(f"[AI] Error reloading faces: {e}", flush=True)


def recognize_face(embedding):
    """Compare embedding against known faces. Returns (name, score) or (None, score)."""
    if embedding is None or len(_known_faces) == 0:
        return None, 0.0
    best_name = None
    best_score = 0.0
    for kf in _known_faces:
        score = float(np.dot(embedding, kf["embedding"]))
        if score > best_score:
            best_score = score
            best_name = kf["name"]
    if best_score >= FACE_SIM_THRESHOLD:
        return best_name, best_score
    return None, best_score


# ── Camera processing ───────────────────────────────────────
def fetch_cameras():
    """Fetch active cameras from backend."""
    headers = {"X-Internal-Key": INTERNAL_KEY}
    try:
        req = urllib.request.Request(f"{API_BASE}/api/internal/cameras", headers=headers)
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        return data
    except Exception as e:
        print(f"[AI] Error fetching cameras: {e}", flush=True)
        return []


def save_snapshot(frame, camera_id, event_type):
    """Save a snapshot and return its path."""
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{camera_id}_{event_type}_{ts}.jpg"
    filepath = os.path.join(SNAPSHOTS_DIR, filename)
    cv2.imwrite(filepath, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return f"/snapshots/{filename}"


def send_event(camera_id, event_type, confidence, snapshot_path, bbox=None, face_name=None, message=None):
    """Send event to backend API via internal endpoint."""
    headers = {"Content-Type": "application/json", "X-Internal-Key": INTERNAL_KEY}
    payload = {
        "cameraId": camera_id,
        "type": event_type,
        "confidence": round(confidence, 4),
        "snapshotPath": snapshot_path,
        "faceName": face_name,
        "message": message,
    }
    if bbox:
        payload["bbox"] = bbox
    try:
        req = urllib.request.Request(
            f"{API_BASE}/api/internal/events",
            data=json.dumps(payload).encode(),
            headers=headers,
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception as e:
        print(f"[AI] Error sending event: {e}", flush=True)


def process_camera(camera):
    """Process a single camera stream for detection + recognition."""
    camera_id = camera["id"]
    name = camera.get("name", camera_id)
    rtsp_url = camera.get("rtspUrl", "")
    zone_polygon = None
    if camera.get("zone") and camera["zone"].get("polygon"):
        pts = camera["zone"]["polygon"]
        if isinstance(pts, list) and len(pts) >= 3:
            zone_polygon = Polygon([(p[0] * FRAME_WIDTH, p[1] * FRAME_WIDTH) for p in pts])

    print(f"[AI] Iniciando procesamiento: {name} ({rtsp_url})", flush=True)
    cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, FRAME_WIDTH)

    last_detection = 0
    retries = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            retries += 1
            if retries > 10:
                print(f"[AI] {name}: stream desconectado, reintentando...", flush=True)
                time.sleep(5)
                cap.release()
                cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)
                retries = 0
            time.sleep(1)
            continue
        retries = 0

        now = time.time()
        if now - last_detection < DETECTION_INTERVAL:
            continue
        last_detection = now

        frame = cv2.resize(frame, (FRAME_WIDTH, int(frame.shape[0] * FRAME_WIDTH / frame.shape[1])))

        try:
            # ── YOLOv8 detection ──
            yolo = get_yolo()
            results = yolo(frame, conf=CONF_THRESHOLD, verbose=False)
            boxes = results[0].boxes

            persons = []
            for box in boxes:
                cls = int(box.cls[0])
                label = yolo.names[cls]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                if label == "person":
                    persons.append({"bbox": [x1, y1, x2, y2], "conf": conf})
                elif label in ("car", "truck", "bus", "motorcycle"):
                    snapshot = save_snapshot(frame, camera_id, "VEHICLE")
                    send_event(camera_id, "VEHICLE", conf, snapshot, bbox=[x1, y1, x2, y2],
                               message=f"Vehículo detectado ({label})")

            # ── Face recognition on detected persons ──
            if persons:
                fa = get_face_app()
                _reload_known_faces()
                faces = fa.get(frame)

                for person in persons:
                    px1, py1, px2, py2 = person["bbox"]
                    cx = (px1 + px2) / 2
                    cy = (py1 + py2) / 2

                    intrusion = False
                    if zone_polygon:
                        intrusion = zone_polygon.contains(Point(cx, cy))

                    # Match faces to this person box
                    matched_face = None
                    for face in faces:
                        fx1, fy1, fx2, fy2 = face.bbox.tolist()
                        fcx = (fx1 + fx2) / 2
                        fcy = (fy1 + fy2) / 2
                        if px1 <= fcx <= px2 and py1 <= fcy <= py2:
                            matched_face = face
                            break

                    if matched_face:
                        emb = matched_face.normed_embedding
                        name, score = recognize_face(emb)
                        if name:
                            snapshot = save_snapshot(frame, camera_id, "FACE_ID")
                            send_event(camera_id, "FACE_ID", score, snapshot,
                                       bbox=matched_face.bbox.tolist(),
                                       face_name=name, message=f"Persona identificada: {name}")
                        else:
                            snapshot = save_snapshot(frame, camera_id, "UNKNOWN_FACE")
                            send_event(camera_id, "UNKNOWN_FACE", score, snapshot,
                                       bbox=matched_face.bbox.tolist(),
                                       message="Rostro desconocido detectado")

                    if intrusion:
                        snapshot = save_snapshot(frame, camera_id, "INTRUSION")
                        send_event(camera_id, "INTRUSION", person["conf"], snapshot,
                                   bbox=person["bbox"], message="Intrusión en zona restringida")
                    elif not matched_face:
                        snapshot = save_snapshot(frame, camera_id, "PERSON")
                        send_event(camera_id, "PERSON", person["conf"], snapshot,
                                   bbox=person["bbox"], message="Persona detectada")

        except Exception as e:
            print(f"[AI] {name} error en detección: {e}", flush=True)

    cap.release()
    print(f"[AI] {name}: procesamiento detenido", flush=True)


# ── Main supervisor thread ──────────────────────────────────
def supervisor():
    """Periodically sync cameras and manage processing threads."""
    active_threads = {}  # camera_id -> {thread, stop}

    while True:
        cameras = fetch_cameras()
        current_ids = {c["id"] for c in cameras}

        # Stop removed cameras
        for cid in list(active_threads.keys()):
            if cid not in current_ids:
                t = active_threads[cid]["thread"]
                # Can't kill threads in Python easily; let them finish naturally
                del active_threads[cid]
                print(f"[AI] Deteniendo cámara {cid}", flush=True)

        # Start new cameras
        for cam in cameras:
            cid = cam["id"]
            if cid not in active_threads:
                t = threading.Thread(target=process_camera, args=(cam,), daemon=True)
                active_threads[cid] = {"thread": t}
                t.start()

        time.sleep(15)  # sync interval


@app.route("/cameras/status")
def cameras_status():
    return jsonify({"processing": list(active_threads_global.keys()) if 'active_threads_global' in globals() else []})


active_threads_global = {}


# ── Entry point ──────────────────────────────────────────────
if __name__ == "__main__":
    # Start supervisor in background
    sup = threading.Thread(target=supervisor, daemon=True)
    sup.start()

    print("[AI] DAWA Security AI Engine iniciando en puerto 5000", flush=True)
    app.run(host="0.0.0.0", port=5000, threaded=True)