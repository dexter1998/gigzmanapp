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
    private glow: boolean;
    private glyph?: string;
    private onClick: () => void;
    private onHoverStart?: () => void;
    private onHoverEnd?: () => void;
    private lastPoint: { x: number; y: number } | null = null;
    private label?: { text: string; muted: boolean };
    private labelDiv: HTMLDivElement | null = null;

    constructor(
      position: google.maps.LatLngLiteral,
      color: string,
      pulsing: boolean,
      onClick: () => void,
      glow = false,
      glyph?: string,
      onHoverStart?: () => void,
      onHoverEnd?: () => void,
      // The business name shown next to the pin, matching Pindrop's own map labels — `muted`
      // (amber, no-website pins) gets a short truncated name since it's the "still an
      // opportunity" state the user glances past many of; a resolved (green, has-website) pin
      // gets its full name since there's nothing further to act on.
      label?: { text: string; muted: boolean }
    ) {
      super();
      this.position = new google.maps.LatLng(position.lat, position.lng);
      this.color = color;
      this.pulsing = pulsing;
      this.glow = glow;
      this.glyph = glyph;
      this.onClick = onClick;
      this.onHoverStart = onHoverStart;
      this.onHoverEnd = onHoverEnd;
      this.label = label;
    }

    /** Screen pixel position relative to the map's CONTAINER div — for positioning a popup card
     * that lives outside the map's overlay panes (a sibling React element in the same relatively-
     * positioned parent as the map container), not for the pin's own rendering. Deliberately uses
     * fromLatLngToContainerPixel, not fromLatLngToDivPixel (used by draw() below): the latter
     * returns coordinates in the overlay PANE's own space, which can be offset from the visible
     * container — the pin itself renders correctly regardless since the browser handles the
     * pane's own positioning, but a separate element positioned using those same raw numbers ends
     * up wrong (confirmed live: draw()'s numbers put a test pin's card near (0,0) despite the pin
     * itself rendering mid-screen). Recomputed on every call, not cached — a pin whose map
     * viewport hasn't moved since it was added may only ever get one internal draw() call. */
    getScreenPosition() {
      const projection = this.getProjection();
      if (!projection) return this.lastPoint;
      const point = projection.fromLatLngToContainerPixel(this.position);
      if (!point) return this.lastPoint;
      return { x: point.x, y: point.y };
    }

    private shadow() {
      const base = "0 1px 4px rgba(0,0,0,0.35)";
      return this.glow ? `${base}, 0 0 10px 3px ${this.color}99` : base;
    }

    onAdd() {
      const div = document.createElement("div");
      div.setAttribute("data-testid", "g-pin");
      div.style.position = "absolute";
      div.style.width = "18px";
      div.style.height = "18px";
      div.style.marginLeft = "-9px";
      div.style.marginTop = "-9px";
      div.style.borderRadius = "50%";
      div.style.background = this.color;
      div.style.border = "2px solid #fff";
      div.style.boxShadow = this.shadow();
      div.style.cursor = "pointer";
      if (this.glyph) {
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.justifyContent = "center";
        div.style.fontSize = "11px";
        div.style.lineHeight = "1";
        div.style.color = "#fff";
        div.style.fontWeight = "800";
        div.textContent = this.glyph;
      }
      if (this.pulsing) div.classList.add("g-pin-pulse");
      div.addEventListener("click", () => this.onClick());
      if (this.onHoverStart) div.addEventListener("mouseenter", () => this.onHoverStart?.());
      if (this.onHoverEnd) div.addEventListener("mouseleave", () => this.onHoverEnd?.());
      this.div = div;
      if (this.label) {
        this.labelDiv = this.buildLabelDiv(this.label);
        div.appendChild(this.labelDiv);
      }

      const panes = this.getPanes();
      panes?.overlayMouseTarget.appendChild(div);
    }

    private buildLabelDiv(label: { text: string; muted: boolean }) {
      const labelDiv = document.createElement("div");
      labelDiv.style.position = "absolute";
      labelDiv.style.top = "22px";
      labelDiv.style.left = "50%";
      labelDiv.style.transform = "translateX(-50%)";
      labelDiv.style.whiteSpace = "nowrap";
      labelDiv.style.fontSize = "11px";
      labelDiv.style.fontWeight = "700";
      labelDiv.style.color = label.muted ? "#fdba3f" : "#f2f4f8";
      labelDiv.style.textShadow = "0 1px 3px rgba(0,0,0,0.8), 0 0 2px rgba(0,0,0,0.8)";
      labelDiv.style.pointerEvents = "none";
      labelDiv.textContent = label.text;
      return labelDiv;
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;
      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;
      this.lastPoint = { x: point.x, y: point.y };
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y}px`;
    }

    onRemove() {
      if (this.div) {
        this.div.remove();
        this.div = null;
        this.labelDiv = null;
      }
    }

    setColor(color: string, pulsing: boolean, glow = false) {
      this.color = color;
      this.pulsing = pulsing;
      this.glow = glow;
      if (this.div) {
        this.div.style.background = color;
        this.div.style.boxShadow = this.shadow();
        this.div.classList.toggle("g-pin-pulse", pulsing);
      }
    }

    setLabel(label?: { text: string; muted: boolean }) {
      this.label = label;
      if (!this.div) return;
      this.labelDiv?.remove();
      this.labelDiv = label ? this.buildLabelDiv(label) : null;
      if (this.labelDiv) this.div.appendChild(this.labelDiv);
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
