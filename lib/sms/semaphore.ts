/**
 * Semaphore SMS Integration Service
 * Dedicated provider for Philippine Telecom SMS Notifications (Smart, Globe, DITO).
 * Documentation: https://semaphore.co/docs
 */

export interface SmsDispatchOptions {
  to: string;
  message: string;
}

export interface SmsResult {
  success: boolean;
  messageId?: string | number;
  recipient: string;
  status: "sent" | "simulated" | "failed";
  error?: string;
}

/**
 * Standardizes any input phone number into standard Philippine 11-digit mobile format: 09XXXXXXXXX
 */
export function normalizePhilippinePhone(rawPhone: string): string | null {
  if (!rawPhone) return null;

  // Remove non-digit characters
  let digits = rawPhone.replace(/\D/g, "");

  // Convert international prefixes (+63 or 63)
  if (digits.startsWith("63") && digits.length === 12) {
    digits = "0" + digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("9")) {
    digits = "0" + digits;
  }

  // Validate that it begins with 09 and is exactly 11 digits long
  if (/^09\d{9}$/.test(digits)) {
    return digits;
  }

  return null;
}

/**
 * Dispatches an SMS message via Semaphore API v4.
 * If SEMAPHORE_API_KEY is not defined in the environment, runs in simulation mode
 * to prevent breaking local testing and developer workflows.
 */
export async function sendSms(options: SmsDispatchOptions): Promise<SmsResult> {
  const normalizedNumber = normalizePhilippinePhone(options.to);

  if (!normalizedNumber) {
    return {
      success: false,
      recipient: options.to,
      status: "failed",
      error: `Invalid Philippine mobile phone format: "${options.to}". Expected 09XXXXXXXXX or +639XXXXXXXXX.`,
    };
  }

  const apiKey = process.env.SEMAPHORE_API_KEY;
  const senderName = process.env.SEMAPHORE_SENDER_NAME; // Optional 11-char approved sender ID

  if (!apiKey) {
    console.info(
      `[Semaphore SMS SIMULATION] (No SEMAPHORE_API_KEY configured in environment)\n` +
      `  Recipient: ${normalizedNumber}\n` +
      `  Message: "${options.message}"\n`
    );
    return {
      success: true,
      recipient: normalizedNumber,
      status: "simulated",
    };
  }

  try {
    const payload: Record<string, string> = {
      apikey: apiKey,
      number: normalizedNumber,
      message: options.message,
    };

    if (senderName) {
      payload.sendername = senderName;
    }

    const response = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = Array.isArray(data)
        ? data[0]?.message || "Failed to dispatch SMS via Semaphore."
        : data.message || "Failed to dispatch SMS via Semaphore.";
      return {
        success: false,
        recipient: normalizedNumber,
        status: "failed",
        error: errorMsg,
      };
    }

    const messageId = Array.isArray(data) ? data[0]?.message_id : data.message_id;

    return {
      success: true,
      recipient: normalizedNumber,
      status: "sent",
      messageId,
    };
  } catch (err: any) {
    console.error("[Semaphore SMS Error]:", err);
    return {
      success: false,
      recipient: normalizedNumber,
      status: "failed",
      error: err.message || "Network error while connecting to Semaphore SMS gateway.",
    };
  }
}

/**
 * High-Level Helper: Send automated booking confirmation SMS to patient.
 */
export async function sendBookingConfirmationSms(params: {
  phone: string;
  patientName: string;
  date: string;
  time: string;
  branchName: string;
  confirmationCode: string;
}): Promise<SmsResult> {
  const shortBranch = params.branchName.replace(/branch/i, "").trim();
  const message =
    `CDG Dental Clinic: Hello ${params.patientName}, your appointment is confirmed!\n` +
    `Date: ${params.date}\n` +
    `Time: ${params.time}\n` +
    `Branch: ${shortBranch}\n` +
    `Ref: ${params.confirmationCode}\n` +
    `Please arrive 10 mins early. Thank you!`;

  return sendSms({
    to: params.phone,
    message,
  });
}

/**
 * High-Level Helper: Send appointment reminder SMS to patient.
 */
export async function sendAppointmentReminderSms(params: {
  phone: string;
  patientName: string;
  date: string;
  time: string;
  branchName: string;
  dentistName?: string;
}): Promise<SmsResult> {
  const shortBranch = params.branchName.replace(/branch/i, "").trim();
  const doctorText = params.dentistName ? ` with ${params.dentistName}` : "";
  const message =
    `CDG Dental Clinic Reminder: Hello ${params.patientName}, you have an appointment tomorrow at ${params.time} (${shortBranch}${doctorText}).\n` +
    `To reschedule, please contact our clinic. See you!`;

  return sendSms({
    to: params.phone,
    message,
  });
}

/**
 * High-Level Helper: Send POS Payment receipt notification.
 */
export async function sendPaymentReceiptSms(params: {
  phone: string;
  patientName: string;
  amount: number;
  billNumber: string;
  branchName: string;
  balanceRemaining?: number;
}): Promise<SmsResult> {
  const formattedAmount = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 0,
  }).format(params.amount);

  const balanceText =
    params.balanceRemaining !== undefined && params.balanceRemaining > 0
      ? ` Bal: ₱${params.balanceRemaining.toLocaleString("en-PH")}.`
      : " Fully settled.";

  const message =
    `CDG Dental Receipt: Payment of ${formattedAmount} received for ${params.patientName} (${params.billNumber}).${balanceText} Thank you!`;

  return sendSms({
    to: params.phone,
    message,
  });
}
