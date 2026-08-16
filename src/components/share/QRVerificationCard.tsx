"use client";

import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";

interface QRVerificationCardProps {
  filumireId: string;
  displayName: string;
}

export function QRVerificationCard({
  filumireId,
  displayName,
}: QRVerificationCardProps) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(`/v/${filumireId}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/v/${filumireId}`);
  }, [filumireId]);

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const svg = document.getElementById(`qr-${filumireId}`);
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filumireId}-qr.svg`;
    link.click();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">QR verification</h3>
      <p className="mt-1 text-sm text-slate-600">
        Scan to open the public verification profile for {displayName}
      </p>
      <div className="mx-auto my-6 inline-block rounded-xl border border-slate-200 bg-white p-4">
        <QRCodeSVG
          id={`qr-${filumireId}`}
          value={url}
          size={180}
          level="M"
          includeMargin
        />
      </div>
      <p className="break-all font-mono text-xs text-slate-500">{url}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <button
          type="button"
          onClick={downloadQr}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Download QR
        </button>
      </div>
    </div>
  );
}
