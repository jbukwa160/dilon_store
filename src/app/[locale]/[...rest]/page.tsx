import { notFound } from "next/navigation";

// Any address that matches no page shows the shop's own 404 inside the layout of the right language.
export default function CatchAll() {
  notFound();
}
