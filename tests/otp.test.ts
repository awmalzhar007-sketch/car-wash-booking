import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { generateAndSendOTP, verifyOTPChallenge } from "@/lib/services/otp";

describe("OTP Service", () => {
  const createdChallengeIds: string[] = [];

  afterEach(async () => {
    if (createdChallengeIds.length > 0) {
      await prisma.oTPChallenge.deleteMany({
        where: { id: { in: createdChallengeIds } },
      });
      createdChallengeIds.length = 0;
    }
  });

  it("generates OTP and successfully verifies with correct code", async () => {
    const phone = "+201099990001";
    const generated = await generateAndSendOTP(phone, "MY_BOOKING");
    createdChallengeIds.push(generated.challengeId);

    expect(generated.code).toHaveLength(6);
    expect(generated.expiresAt.getTime()).toBeGreaterThan(Date.now());

    const result = await verifyOTPChallenge(generated.challengeId, generated.code);
    expect(result.success).toBe(true);

    // Re-verification of used code must fail
    const reVerify = await verifyOTPChallenge(generated.challengeId, generated.code);
    expect(reVerify.success).toBe(false);
    expect(reVerify.error).toBe("ALREADY_VERIFIED");
  });

  it("handles incorrect code and tracks remaining attempts", async () => {
    const phone = "+201099990002";
    const generated = await generateAndSendOTP(phone, "MY_BOOKING");
    createdChallengeIds.push(generated.challengeId);

    // 1st wrong attempt
    const r1 = await verifyOTPChallenge(generated.challengeId, "000000");
    expect(r1.success).toBe(false);
    expect(r1.error).toBe("INVALID_CODE");

    // 2nd wrong attempt
    const r2 = await verifyOTPChallenge(generated.challengeId, "000000");
    expect(r2.success).toBe(false);

    // 3rd wrong attempt -> max attempts reached
    const r3 = await verifyOTPChallenge(generated.challengeId, "000000");
    expect(r3.success).toBe(false);

    // 4th attempt must be blocked with MAX_ATTEMPTS_EXCEEDED
    const r4 = await verifyOTPChallenge(generated.challengeId, generated.code);
    expect(r4.success).toBe(false);
    expect(r4.error).toBe("MAX_ATTEMPTS_EXCEEDED");
  });

  it("enforces resend cooldown", async () => {
    const phone = "+201099990003";
    const generated = await generateAndSendOTP(phone, "MY_BOOKING");
    createdChallengeIds.push(generated.challengeId);

    // Requesting immediately again must be blocked by cooldown
    await expect(generateAndSendOTP(phone, "MY_BOOKING")).rejects.toThrow("OTP_COOLDOWN_ACTIVE");
  });

  it("rejects expired OTP", async () => {
    const phone = "+201099990004";
    const generated = await generateAndSendOTP(phone, "MY_BOOKING");
    createdChallengeIds.push(generated.challengeId);

    // Manually expire the challenge in DB
    await prisma.oTPChallenge.update({
      where: { id: generated.challengeId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const result = await verifyOTPChallenge(generated.challengeId, generated.code);
    expect(result.success).toBe(false);
    expect(result.error).toBe("EXPIRED");
  });
});