import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("❌ STRIPE_SECRET_KEY environment variable is required");
}

// Initialize Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-02-01", // Latest stable version
});

console.log("✅ Stripe initialized successfully!");

export async function createPaymentIntent(amount: number): Promise<{
  clientSecret: string;
  error?: string;
}> {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // amount in cents
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret!,
    };
  } catch (error: any) {
    console.error("❌ Stripe API error (createPaymentIntent):", error);
    return {
      clientSecret: "",
      error: error.message,
    };
  }
}

export async function createCustomerPortalSession(customerId: string): Promise<{
  url: string;
  error?: string;
}> {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL}/settings`,
    });

    return { url: session.url };
  } catch (error: any) {
    console.error("❌ Stripe API error (createCustomerPortalSession):", error);
    return {
      url: "",
      error: error.message,
    };
  }
}

export async function createSubscriptionCheckoutSession(
  priceId: string,
  customerId: string | null,
  email: string,
  successUrl: string,
  cancelUrl: string,
): Promise<{
  checkoutUrl?: string;
  error?: string;
}> {
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId || undefined,
      customer_email: customerId ? undefined : email,
    });

    if (!session.url) {
      throw new Error("❌ Failed to create checkout session URL");
    }

    return { checkoutUrl: session.url };
  } catch (error: any) {
    console.error("❌ Stripe API error (createSubscriptionCheckoutSession):", error);
    return {
      error: error.message,
    };
  }
}

export async function createOrRetrieveCustomer(email: string, name: string): Promise<{
  customerId: string;
  error?: string;
}> {
  try {
    // Search for existing customer
    const customers = await stripe.customers.list({ email });

    if (customers.data.length > 0) {
      return { customerId: customers.data[0].id };
    }

    // Create new customer if none exists
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        source: "EduBuddy Platform",
      },
    });

    return { customerId: customer.id };
  } catch (error: any) {
    console.error("❌ Stripe API error (createOrRetrieveCustomer):", error);
    return {
      customerId: "",
      error: error.message,
    };
  }
}
