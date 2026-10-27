import { Activity, Baby, Bone, Brain, Droplet, Ear, Eye, HeartPulse, Microscope, Ribbon, Scissors, Smile, Stethoscope, Syringe, Users } from "lucide-react";

const icons = { Activity, Baby, Bone, Brain, Droplet, Ear, Eye, HeartPulse, Microscope, Ribbon, Scissors, Smile, Stethoscope, Syringe, Users };

export function DeptIcon({ name, className }: { name: string | null; className?: string }) {
  const Icon = (name && (icons as Record<string, typeof Activity>)[name]) || Stethoscope;
  return <Icon className={className} aria-hidden />;
}
