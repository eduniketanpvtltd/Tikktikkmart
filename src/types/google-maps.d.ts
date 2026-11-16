declare global {
  interface Window {
    google?: any;
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace google {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace maps {
      type Map = any;
      type Marker = any;
      type MapMouseEvent = any;
      const Map: any;
      const Marker: any;
      const Geocoder: any;
      // eslint-disable-next-line @typescript-eslint/no-namespace
      namespace places {
        const Autocomplete: any;
      }
    }
  }
}

export {};

