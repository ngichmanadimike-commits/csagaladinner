const WA_LINK =
  "https://wa.me/254758647130?text=Hello,%20I%20am%20interested%20in%20booking%20a%20ticket%20for%20the%20CSA%20Gala%20Dinner";

const WhatsAppButton = () => (
  <a
    href={WA_LINK}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Chat on WhatsApp"
    className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200"
    style={{ backgroundColor: "#25D366" }}
  >
    {/* WhatsApp SVG icon */}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="30"
      height="30"
      fill="white"
      aria-hidden="true"
    >
      <path d="M16.003 2.667C8.637 2.667 2.667 8.637 2.667 16c0 2.363.627 4.673 1.817 6.697L2.667 29.333l6.803-1.787A13.267 13.267 0 0 0 16.003 29.333c7.367 0 13.33-5.97 13.33-13.333S23.37 2.667 16.003 2.667zm0 24c-2.113 0-4.18-.573-5.98-1.657l-.43-.257-4.037 1.06 1.073-3.923-.28-.45A10.617 10.617 0 0 1 5.333 16c0-5.883 4.787-10.667 10.67-10.667S26.667 10.117 26.667 16 21.887 26.667 16.003 26.667zm5.847-7.99c-.32-.16-1.893-.933-2.187-1.04-.293-.107-.507-.16-.72.16-.213.32-.827 1.04-.013 1.04.107 0 .213.013.32.04.107.013.213.04.307.08.32.133.64.24.96.307.32.053.653.04.96-.053.32-.107.64-.32.88-.587.24-.267.413-.587.467-.933.053-.347.027-.707-.08-1.04-.16-.44-.56-.733-1.067-.893-.507-.16-1.04-.16-1.547 0-.507.16-.96.467-1.293.88-.333.413-.52.92-.52 1.44 0 .52.187 1.027.52 1.44.107.133.227.253.36.36.373.32.8.56 1.253.72.453.147.933.2 1.413.147.48-.053.947-.213 1.36-.467.413-.253.76-.587 1.013-.987.253-.4.4-.853.413-1.32.013-.467-.107-.933-.347-1.347-.24-.413-.587-.747-.993-.973zm-5.847-9.01c-4.413 0-8 3.587-8 8a7.947 7.947 0 0 0 1.333 4.413L8 24l3.307-.867a7.96 7.96 0 0 0 4.696 1.534c4.413 0 8-3.587 8-8s-3.587-8-8-8z" />
    </svg>

    {/* Pulse ring */}
    <span
      className="absolute inset-0 rounded-full animate-ping opacity-30"
      style={{ backgroundColor: "#25D366" }}
    />
  </a>
);

export default WhatsAppButton;
