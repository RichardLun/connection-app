// Draws a QR code. Kids scan it with their phone's camera to open the
// check-in, so nobody has to type a long address.
// The library comes from esm.sh, the same way lib/supabase.js loads Supabase.
import qrcode from "https://esm.sh/qrcode-generator@1.4.4";
import { svgEl } from "./app.js";

// Returns a picture of a QR code that opens link. Make the link with
// fullUrl() from ui/app.js: a phone can't open a short address like
// "checkin.html?group=..." on its own.
export function qrCode(link) {
  const qr = qrcode(0, "M");
  qr.addData(link);
  qr.make();

  // Phone cameras need a white border around the code to find it.
  const border = 4;
  const count = qr.getModuleCount();
  const size = count + border * 2;
  let squares = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) squares += `M${col + border} ${row + border}h1v1h-1z`;
    }
  }

  // No "crispEdges" here on purpose: it made Safari draw the squares unevenly
  // on some screens, and then the code couldn't be read.
  return svgEl("svg", {
    class: "qr",
    viewBox: `0 0 ${size} ${size}`,
    role: "img",
    "aria-label": "QR code that opens the check-in",
  },
    svgEl("rect", { width: size, height: size, fill: "white" }),
    svgEl("path", { d: squares, fill: "black" }),
  );
}
