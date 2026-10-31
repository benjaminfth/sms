import { PlanLifecyclePolicy, PaymentTerms } from "@sms/shared";

interface PlanLike {
  id?: string;
  name?: string;
  description?: string | null;
  endDate?: Date | null;
  isActive?: boolean;
}

/**
 * Extracts and evaluates lifecycle policies for a plan.
 * Respects configuration encoded in plan metadata / description with standard defaults.
 */
export class PlanPolicyHelper {
  /**
   * Parses the lifecycle policy configured on a plan.
   */
  static getPolicy(plan: PlanLike | null | undefined): PlanLifecyclePolicy {
    if (!plan || !plan.description) {
      return {
        allowPause: true,
        allowEarlyClosure: true,
        allowRenewal: true,
        autoCloseAtEnd: true,
        defaultPaymentTerms: "NET_15",
      };
    }

    try {
      // Check if description contains a JSON configuration object
      const jsonMatch = plan.description.match(/\{[\s\S]*"allow(?:Pause|Renewal|EarlyClosure|PaymentTerms)"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          allowPause: parsed.allowPause ?? true,
          allowEarlyClosure: parsed.allowEarlyClosure ?? true,
          allowRenewal: parsed.allowRenewal ?? true,
          autoCloseAtEnd: parsed.autoCloseAtEnd ?? true,
          defaultPaymentTerms: parsed.defaultPaymentTerms ?? "NET_15",
        };
      }
    } catch {
      // Fall through to text-based matching
    }

    // Keyword heuristics in description (e.g., "[DISALLOW_PAUSE]", "[NO_RENEWAL]", "[NO_EARLY_CLOSE]")
    const desc = plan.description.toUpperCase();
    const allowPause = !desc.includes("DISALLOW_PAUSE") && !desc.includes("NO_PAUSE");
    const allowEarlyClosure = !desc.includes("DISALLOW_EARLY_CLOSURE") && !desc.includes("NO_EARLY_CANCEL");
    const allowRenewal = !desc.includes("DISALLOW_RENEWAL") && !desc.includes("NO_RENEWAL");
    const autoCloseAtEnd = !desc.includes("NO_AUTO_CLOSE");

    let defaultPaymentTerms: PaymentTerms = "NET_15";
    if (desc.includes("DUE_IMMEDIATELY")) defaultPaymentTerms = "DUE_IMMEDIATELY";
    else if (desc.includes("NET_7")) defaultPaymentTerms = "NET_7";
    else if (desc.includes("NET_30")) defaultPaymentTerms = "NET_30";

    return {
      allowPause,
      allowEarlyClosure,
      allowRenewal,
      autoCloseAtEnd,
      defaultPaymentTerms,
    };
  }

  static canPause(plan: PlanLike | null | undefined): boolean {
    return this.getPolicy(plan).allowPause !== false;
  }

  static canCloseEarly(plan: PlanLike | null | undefined): boolean {
    return this.getPolicy(plan).allowEarlyClosure !== false;
  }

  static canRenew(plan: PlanLike | null | undefined): boolean {
    return this.getPolicy(plan).allowRenewal !== false;
  }

  static shouldAutoClose(plan: PlanLike | null | undefined): boolean {
    return this.getPolicy(plan).autoCloseAtEnd !== false;
  }

  static getDefaultPaymentTerms(plan: PlanLike | null | undefined): PaymentTerms {
    return this.getPolicy(plan).defaultPaymentTerms || "NET_15";
  }
}

