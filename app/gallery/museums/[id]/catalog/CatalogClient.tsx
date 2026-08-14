"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getPublicMuseumDetail } from "../../../../lib/museum";

export default function CatalogClient({ museumId }: { museumId: number }) {
  const query = useQuery({ queryKey: ["gallery", "museum", museumId, "catalog"], queryFn: () => getPublicMuseumDetail(museumId) });
  const museum = query.data?.data;
  const [qrCode, setQrCode] = useState("");
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/gallery/museums/${museumId}`, {
      width: 320, margin: 1, color: { dark: "#111111", light: "#f5f0e6" },
    }).then(setQrCode).catch(() => setQrCode(""));
  }, [museumId]);
  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#f5f0e6] px-6 py-8 text-[#171816] print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl">
        <nav className="mb-8 flex justify-between print:hidden"><Link href={`/gallery/museums/${museumId}`}>전시로 돌아가기</Link><button type="button" onClick={() => window.print()} className="bg-[#171816] px-5 py-2 text-sm text-white">도록 인쇄 / PDF</button></nav>
        {museum ? (
          <>
            <header className="grid min-h-[60vh] content-between border-y border-[#171816] py-10">
              <p className="text-xs uppercase tracking-[0.3em]">MUSE Permanent Exhibition</p>
              <div><h1 className="font-[var(--font-display)] text-6xl md:text-8xl">{museum.name}</h1><p className="mt-4 text-lg">{museum.ownerName}</p><p className="mt-8 max-w-2xl leading-8 text-black/65">{museum.curatorNote || museum.description}</p></div>
              <div className="flex items-end justify-between gap-5"><p className="text-xs uppercase tracking-[0.2em]">Digital catalog · {museum.artworks.length} works</p>{qrCode ? <Image src={qrCode} alt="온라인 전시 QR 코드" width={112} height={112} unoptimized /> : null}</div>
            </header>
            <section className="mt-16 space-y-20">
              {museum.artworks.map((artwork, index) => (
                <article key={artwork.museumArtworkId} className="break-inside-avoid border-t border-black/30 pt-6 md:grid md:grid-cols-[1.35fr_.65fr] md:gap-10">
                  <div className="relative aspect-[4/3]"><Image src={artwork.imageUrl} alt={artwork.title} fill sizes="(min-width: 768px) 60vw, 100vw" preload={index === 0} className="object-contain object-left" /></div>
                  <div className="mt-5 md:mt-0"><p className="text-xs tracking-[0.2em]">{String(index + 1).padStart(2, "0")} · {artwork.roomLabel || "Main hall"}</p><h2 className="mt-4 font-[var(--font-display)] text-4xl">{artwork.title}</h2><p className="mt-5 whitespace-pre-line leading-7 text-black/65">{artwork.description}</p>{artwork.audioTranscript ? <p className="mt-6 border-l border-black/30 pl-4 text-sm italic leading-6">{artwork.audioTranscript}</p> : null}</div>
                </article>
              ))}
            </section>
          </>
        ) : <p>{query.data?.error ?? "도록을 준비하고 있습니다."}</p>}
      </div>
    </main>
  );
}
