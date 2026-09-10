import { describe, it, expect } from "vitest";
import { extractDevicesFromProjectPayload, lightenProjectForLocalStorage } from "./projectSync";

describe("projectSync module", () => {
  it("extracts seeded devices from wrapped project JSON payload correctly", () => {
    const payload = {
      metadata: { id: "p1", name: "cmsa05_0_01_dd_v2pb" },
      data: {
        floorPlan: { id: "fp1", name: "Plano Nivel 1", width: 1000, height: 800, url: "" },
        cameras: [
          { id: "cam1", type: "bullet", modelId: "FD9383-HTV", modelName: "FD9383-HTV", x: 100, y: 100 },
          { id: "cam2", type: "dome", modelId: "FD9383-HTV", modelName: "FD9383-HTV", x: 200, y: 200 },
        ],
        accessDevices: [
          { id: "acc1", type: "reader", modelId: "SpeedFace V5L", modelName: "SpeedFace V5L", x: 150, y: 150 },
        ],
        voceoDevices: [
          { id: "voc1", type: "speaker", modelId: "A201", modelName: "A201", x: 120, y: 120 },
        ],
        fireDevices: [
          { id: "fir1", type: "smoke", modelId: "ALO-V", modelName: "ALO-V", x: 180, y: 180 },
        ],
        parkingDevices: [
          { id: "prk1", type: "barrier", modelId: "BGM1000", modelName: "BGM1000", x: 250, y: 250 },
        ],
      },
    };

    const extracted = extractDevicesFromProjectPayload(payload);
    expect(extracted.projectName).toBe("cmsa05_0_01_dd_v2pb");
    expect(extracted.cameras.length).toBe(2);
    expect(extracted.accessDevices.length).toBe(1);
    expect(extracted.voceoDevices.length).toBe(1);
    expect(extracted.fireDevices.length).toBe(1);
    expect(extracted.parkingDevices.length).toBe(1);
    expect(extracted.floorPlan?.name).toBe("Plano Nivel 1");
  });

  it("extracts seeded devices from flat JSON files lacking metadata and data wrappers", () => {
    const flatPayload = {
      name: "cmsa05_0_01_dd_v2pb",
      floorPlan: { id: "fp1", name: "Plano Nivel 1", width: 1000, height: 800, url: "" },
      cameras: [
        { id: "cam1", type: "bullet", modelId: "FD9383-HTV", modelName: "FD9383-HTV", x: 100, y: 100 },
      ],
      accessDevices: [
        { id: "acc1", type: "reader", modelId: "SpeedFace V5L", modelName: "SpeedFace V5L", x: 150, y: 150 },
      ],
      voceoDevices: [
        { id: "voc1", type: "speaker", modelId: "A201", modelName: "A201", x: 120, y: 120 },
      ],
      fireDevices: [
        { id: "fir1", type: "smoke", modelId: "ALO-V", modelName: "ALO-V", x: 180, y: 180 },
      ],
      parkingDevices: [
        { id: "prk1", type: "barrier", modelId: "BGM1000", modelName: "BGM1000", x: 250, y: 250 },
      ],
    };

    const extracted = extractDevicesFromProjectPayload(flatPayload);
    expect(extracted.projectName).toBe("cmsa05_0_01_dd_v2pb");
    expect(extracted.cameras.length).toBe(1);
    expect(extracted.accessDevices.length).toBe(1);
    expect(extracted.voceoDevices.length).toBe(1);
    expect(extracted.fireDevices.length).toBe(1);
    expect(extracted.parkingDevices.length).toBe(1);
  });

  it("lightens heavy base64 image strings for localStorage fallback safely", () => {
    const heavyPayload = {
      id: "p1",
      metadata: { id: "p1", name: "Heavy Project" },
      data: {
        floorPlan: { id: "fp1", url: "data:image/png;base64," + "A".repeat(60000) },
        cameras: [{ id: "c1" }],
      },
    };

    const lightened = lightenProjectForLocalStorage(heavyPayload);
    expect(lightened.data.floorPlan.url).toBe("");
    expect(heavyPayload.data.floorPlan.url.length).toBeGreaterThan(60000);
  });
});
