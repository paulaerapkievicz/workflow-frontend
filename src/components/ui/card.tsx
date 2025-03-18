import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
}

export function Card({ children }: CardProps) {
  return <div className="bg-white p-4 rounded-lg shadow-md">{children}</div>;
}

export function CardHeader({ children }: CardProps) {
  return <div className="border-b pb-2">{children}</div>;
}

export function CardTitle({ children }: CardProps) {
  return <h3 className="text-lg font-semibold">{children}</h3>;
}

export function CardContent({ children }: CardProps) {
  return <div className="mt-2">{children}</div>;
}
