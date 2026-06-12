"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";

// Swagger UI needs to be imported dynamically with ssr disabled
// to avoid "window is not defined" errors during server-side rendering.
const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function ApiDocs() {
  return (
    <div className="bg-white min-h-screen">
      <SwaggerUI url="/swagger.json" />
    </div>
  );
}
