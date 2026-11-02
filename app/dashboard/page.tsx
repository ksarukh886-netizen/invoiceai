const { data: subscription, error: subscriptionError } = await supabase
  .from("subscriptions")
  .select("plan,status,current_period_end,razorpay_mode")
  .eq("user_id", user.id)
  .maybeSingle();

if (subscriptionError) {
  console.error("Subscription fetch error:", subscriptionError);
}

const isSubscriptionDateValid =
  !subscription?.current_period_end ||
  new Date(subscription.current_period_end).getTime() > Date.now();

setIsPro(
  subscription?.plan === "pro" &&
    subscription?.status === "active" &&
    subscription?.razorpay_mode === "live" &&
    isSubscriptionDateValid
);
