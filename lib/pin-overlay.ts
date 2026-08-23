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

/** Dark, low-clutter basemap matching Pindrop's own dark dashboard screenshot — hides every
 * default POI icon/label (restaurants, hospitals, banks, shops, schools, everything Google
 * shows by default) and transit entirely, so the ONLY pins visible are our own lead markers
 * and the "you are here" dot. This only works on non-mapId (2D raster) maps — mapId-based
 * vector/3D maps ignore inline styles entirely, which is why 3D and this had to be traded off
 * for now. */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1a1f2b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1f2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a93a6" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b3242" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a4358" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b7385" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#3a4358" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f141d" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#1a1f2b" }] },
];
