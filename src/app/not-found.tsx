import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <h1 className="text-6xl font-bold text-teal-600">404</h1>
      <p className="text-lg text-muted-foreground">Страница не найдена</p>
      <Link href="/dashboard">
        <Button className="bg-teal-600 hover:bg-teal-700">
          <Home className="w-4 h-4 mr-2" />
          На главную
        </Button>
      </Link>
    </div>
  );
}
