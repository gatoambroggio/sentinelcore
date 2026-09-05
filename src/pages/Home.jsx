import React from "react";
import { Link } from "react-router-dom";
import { GitBranch, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">SentinelCore</h1>
        <p className="text-sm text-muted-foreground">
          Panel de sincronización con GitHub para el repositorio SentinelCore.
        </p>
        <Link to="/sync">
          <Button className="w-full">
            <GitBranch className="w-4 h-4 mr-2" />
            Abrir sincronización
          </Button>
        </Link>
      </Card>
    </div>
  );
}