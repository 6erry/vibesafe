import type { Rule } from "../rule";
import { createFinding, findLine, isFrontendPath } from "./helpers";

export const stripeWebhookNoSignatureRule: Rule = {
  id: "stripe.webhook-no-signature",
  title: "Stripe webhook without signature verification",
  description:
    "Detects likely Stripe webhook handlers that do not call stripe.webhooks.constructEvent.",
  defaultSeverity: "high",
  category: "payment",
  run(context) {
    const findings = [];

    for (const file of context.files) {
      if (!isLikelyStripeWebhook(file.path, file.content)) {
        continue;
      }

      if (!/stripe\.webhooks\.constructEvent\b/.test(file.content)) {
        findings.push(
          createFinding({
            ruleId: stripeWebhookNoSignatureRule.id,
            title: stripeWebhookNoSignatureRule.title,
            severity: "high",
            category: "payment",
            file,
            message:
              "This looks like a Stripe webhook handler, but it does not verify signatures with `stripe.webhooks.constructEvent`.",
            recommendation:
              "Use the raw request body and `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` before trusting webhook events.",
            confidence: "medium",
          }),
        );
        continue;
      }

      if (!/\b(rawBody|arrayBuffer|buffer|text)\s*\(/i.test(file.content)) {
        findings.push(
          createFinding({
            ruleId: stripeWebhookNoSignatureRule.id,
            title: stripeWebhookNoSignatureRule.title,
            severity: "medium",
            category: "payment",
            file,
            message:
              "Stripe webhook signature verification is present, but the handler may not be using the raw body.",
            recommendation:
              "Confirm the handler passes the exact raw request body into `stripe.webhooks.constructEvent`.",
            confidence: "low",
          }),
        );
      }
    }

    return findings;
  },
};

export const stripeSecretKeyClientRule: Rule = {
  id: "stripe.secret-key-client",
  title: "Stripe secret key exposed to client",
  description:
    "Detects Stripe secret keys and public secret-key environment names in frontend code.",
  defaultSeverity: "critical",
  category: "payment",
  run(context) {
    const findings = [];
    const secretKeyLine = /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/;
    const publicNameLine =
      /\b(?:NEXT_PUBLIC|VITE|PUBLIC)_[A-Z0-9_]*STRIPE[A-Z0-9_]*SECRET[A-Z0-9_]*KEY\b/i;

    for (const file of context.files) {
      if (
        !isFrontendPath(file.path) &&
        !/\.(tsx|jsx|vue|svelte)$/.test(file.path)
      ) {
        continue;
      }

      const secret = findLine(file.content, secretKeyLine);
      const publicName = findLine(file.content, publicNameLine);
      const match = secret ?? publicName;
      if (!match) {
        continue;
      }

      findings.push(
        createFinding({
          ruleId: stripeSecretKeyClientRule.id,
          title: stripeSecretKeyClientRule.title,
          severity: "critical",
          category: "payment",
          file,
          line: match.line,
          column: match.column,
          message:
            "A Stripe secret key or public secret-key variable appears in frontend code.",
          evidence: match.text.replace(
            /sk_(live|test)_[A-Za-z0-9]{8,}/g,
            "sk_$1_************",
          ),
          recommendation:
            "Use Stripe publishable keys in the browser and keep secret keys on trusted server code only.",
          confidence: "high",
        }),
      );
    }

    return findings;
  },
};

function isLikelyStripeWebhook(path: string, content: string): boolean {
  const lowerPath = path.toLowerCase();
  return (
    (lowerPath.includes("stripe") && lowerPath.includes("webhook")) ||
    (/stripe/i.test(content) &&
      /webhook/i.test(content) &&
      /POST|post|handler|route/.test(content))
  );
}
