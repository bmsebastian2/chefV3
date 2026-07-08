import type { Metadata } from "next";
import { AssistantEntry } from "@/components/assistant/AssistantEntry";

export const metadata: Metadata = {
  title: "Asistente · GetChef",
  description: "Encontremos tu chef ideal en cuatro pasos.",
};

export default function AsistentePage() {
  return <AssistantEntry />;
}
