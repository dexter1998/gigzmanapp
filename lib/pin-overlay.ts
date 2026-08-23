/** Custom OverlayView-based pin — avoids AdvancedMarkerElement's requirement for a Cloud
 * Console-registered Map ID (we never registered one, which is why the map fell back to
 * Google's default style with all its POI clutter). Gives full control over color, the
 * pulsing "checking" animation, and click handling via plain DOM/CSS.
 *
 * The class itself is only DEFINED (via this factory) after the Google Maps script has
 * actually loaded — `extends google.maps.OverlayView` is evaluated the moment the class
 * declaration runs, so declaring it at module scope throws "google is not defined" if this
 * file is imported (as it normally is, at the top of a page component) before the async
 * Maps script resolves. Call this once loadGoogleMaps() has resolved. */
export type PinOverlayInstance = InstanceType<ReturnType<typeof createPinOverlayClass>>;

export function createPinOverlayClass() {
  class PinOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private position: google.maps.LatLng;
    private color: string;
    private pulsing: boolean;
    private onClick: () => void;

    constructor(position: google.maps.LatLngLiteral, color: string, pulsing: boolean, onClick: () => void) {
      super();
      this.position = new google.maps.LatLng(position.lat, position.lng);
      this.color = color;
      this.pulsing = pulsing;
      this.onClick = onClick;
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.width = "18px";
      div.style.height = "18px";
      div.style.marginLeft = "-9px";
      div.style.marginTop = "-9px";
      div.style.borderRadius = "50%";
      div.style.background = this.color;
      div.style.border = "2px solid #fff";
      div.style.boxShadow = "0 1px 4px rgba(0,0,0,0.35)";
      div.style.cursor = "pointer";
      if (this.pulsing) div.classList.add("g-pin-pulse");
      div.addEventListener("click", () => this.onClick());
      this.div = div;

      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.div) {
        this.div.remove();
        this.div = null;
      }
    }

    setColor(color: string, pulsing: boolean) {
      this.color = color;
      this.pulsing = pulsing;
      if (this.div) {
        this.div.style.background = color;
        this.div.classList.toggle("g-pin-pulse", pulsing);
      }
    }
  }

  return PinOverlay;
}

/** Muted, low-clutter basemap matching Pindrop's reference screenshots — hides default POI
 * icons/labels (restaurants, hospitals, banks etc.) and transit, keeps roads/geography minimal
 * so only our own lead pins stand out. */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "all", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f3efe6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfe0e8" }] },
];
