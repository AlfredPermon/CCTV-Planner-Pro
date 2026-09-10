import { describe, it, expect } from "vitest";
import { generateMultiSystemSummary, matchDeviceWithCatalog } from "./multiSystemReport";

describe("multiSystemReport core engine", () => {
  it("computes exact totals and system percentages for empty state with pure real counts (0)", () => {
    const summary = generateMultiSystemSummary({});
    expect(summary.totalSeededDevices).toBe(0);
    expect(summary.totalDevices).toBe(0);
    expect(summary.systemCounts.cctv).toBe(0);
    expect(summary.systemCounts.access).toBe(0);
    expect(summary.systemCounts.voceo).toBe(0);
    expect(summary.systemCounts.fire).toBe(0);
    expect(summary.systemCounts.parking).toBe(0);
    expect(summary.reconciliation.status).toBe("valid");
    expect(summary.reconciliation.integrityScore).toBe(100);
  });

  it("calculates exact counts and matches device models with system catalogs when devices are seeded", () => {
    const summary = generateMultiSystemSummary({
      cameras: [
        { id: "cam1", type: "bullet", modelId: "ib9360-h", modelName: "IB9360-H", x: 100, y: 100 } as any,
        { id: "cam2", type: "bullet", modelId: "ib9360-h", modelName: "IB9360-H", x: 200, y: 200 } as any,
        { id: "cam3", type: "fisheye", modelId: "fe9191", modelName: "FE9191", x: 300, y: 300 } as any,
      ],
      accessDevices: [
        { id: "acc1", type: "reader", modelId: "SpeedFace V5L", modelName: "SpeedFace V5L", x: 150, y: 150 } as any,
      ],
      voceoDevices: [
        { id: "voc1", type: "speaker", modelId: "fanvil-a201", modelName: "A201", x: 120, y: 120 } as any,
      ],
      fireDevices: [
        { id: "fir1", type: "smoke", modelId: "ALO-V", modelName: "ALO-V", x: 180, y: 180 } as any,
      ],
      parkingDevices: [
        { id: "prk1", type: "barrier", modelId: "bgm1000", modelName: "BGM1000", x: 250, y: 250 } as any,
      ],
      floorPlan: { id: "fp1", name: "Plano Nivel 1", width: 1000, height: 800, url: "" } as any,
    });

    expect(summary.totalSeededDevices).toBe(7);
    expect(summary.totalDevices).toBe(7);
    expect(summary.systemCounts.cctv).toBe(3);
    expect(summary.systemCounts.access).toBe(1);
    expect(summary.systemCounts.voceo).toBe(1);
    expect(summary.systemCounts.fire).toBe(1);
    expect(summary.systemCounts.parking).toBe(1);

    // Percentages sum check
    const sumPct =
      summary.systemPercentages.cctv +
      summary.systemPercentages.access +
      summary.systemPercentages.voceo +
      summary.systemPercentages.fire +
      summary.systemPercentages.parking;

    expect(sumPct).toBeCloseTo(100, 0);

    // CCTV model breakdown check
    const cctvGroups = summary.breakdownBySystem.cctv.modelGroups;
    expect(cctvGroups.length).toBe(2);
    const bulletGroup = cctvGroups.find((g) => g.modelId === "ib9360-h");
    expect(bulletGroup?.quantity).toBe(2);
    expect(bulletGroup?.brand).toBe("Vivotek");
  });

  it("detects discrepancies when devices lack floor plans or have invalid coordinates", () => {
    const summary = generateMultiSystemSummary({
      cameras: [
        { id: "cam_orphan", type: "bullet", modelName: "Orphan Cam", x: -50, y: 100 } as any,
      ],
    });

    expect(summary.reconciliation.discrepancies.length).toBeGreaterThan(0);
    expect(summary.reconciliation.status).toBe("error");
  });

  it("matches custom and default catalog items correctly", () => {
    const match = matchDeviceWithCatalog("cctv", "fe9191");
    expect(match.matched).toBe(true);
    expect(match.brand).toBe("Vivotek");
    expect(match.modelName).toBe("FE9191");
  });
});
