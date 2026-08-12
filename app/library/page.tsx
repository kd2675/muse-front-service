import type { Metadata } from "next";
import LibraryClient from "./LibraryClient";

export const metadata: Metadata = { title: "나의 관람 기록" };
export default function LibraryPage() { return <LibraryClient />; }
