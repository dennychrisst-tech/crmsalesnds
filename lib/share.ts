// Share plain text to WhatsApp — wa.me opens the app on mobile (the user picks
// a chat/group there) or WhatsApp Web on desktop. Text uses WA markup (*bold*).
export function shareToWhatsApp(text: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
}
