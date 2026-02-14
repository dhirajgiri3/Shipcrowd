import 'dotenv/config';

type Check = {
    name: string;
    passed: boolean;
    detail: string;
};

function checkRazorpayConfig(): Check[] {
    const checks: Check[] = [];

    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const accountNumber = process.env.RAZORPAY_ACCOUNT_NUMBER || '';
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const paymentWebhookSecret = process.env.RAZORPAY_PAYMENT_WEBHOOK_SECRET || '';
    const payoutWebhookSecret = process.env.RAZORPAY_PAYOUT_WEBHOOK_SECRET || '';
    const commissionWebhookSecret = process.env.RAZORPAY_COMMISSION_WEBHOOK_SECRET || '';

    checks.push({
        name: 'RAZORPAY_KEY_ID',
        passed: keyId.length > 0,
        detail: keyId.length > 0 ? 'Present' : 'Missing',
    });

    checks.push({
        name: 'RAZORPAY_KEY_SECRET',
        passed: keySecret.length > 0,
        detail: keySecret.length > 0 ? 'Present' : 'Missing',
    });

    checks.push({
        name: 'RAZORPAY_ACCOUNT_NUMBER',
        passed: accountNumber.length > 0,
        detail: accountNumber.length > 0 ? 'Present' : 'Missing',
    });

    checks.push({
        name: 'RAZORPAY_KEY_ID mode',
        passed: keyId.startsWith('rzp_test_'),
        detail: keyId.startsWith('rzp_test_')
            ? 'Test mode key detected'
            : 'Expected test key (rzp_test_*) for local verification',
    });

    const webhookLooksLikeUrl = (value: string) => /^https?:\/\//i.test(value);
    const hasAnyWebhookSecret = Boolean(
        webhookSecret || paymentWebhookSecret || payoutWebhookSecret || commissionWebhookSecret
    );

    checks.push({
        name: 'Razorpay webhook secrets',
        passed: hasAnyWebhookSecret,
        detail: hasAnyWebhookSecret
            ? 'At least one webhook secret is configured'
            : 'Missing: configure RAZORPAY_WEBHOOK_SECRET or split webhook secrets',
    });

    const webhookChecks: Array<{ name: string; value: string; fallback: string }> = [
        { name: 'RAZORPAY_WEBHOOK_SECRET', value: webhookSecret, fallback: 'N/A' },
        { name: 'RAZORPAY_PAYMENT_WEBHOOK_SECRET', value: paymentWebhookSecret, fallback: 'RAZORPAY_WEBHOOK_SECRET' },
        { name: 'RAZORPAY_PAYOUT_WEBHOOK_SECRET', value: payoutWebhookSecret, fallback: 'RAZORPAY_WEBHOOK_SECRET' },
        { name: 'RAZORPAY_COMMISSION_WEBHOOK_SECRET', value: commissionWebhookSecret, fallback: 'RAZORPAY_WEBHOOK_SECRET' },
    ];

    for (const item of webhookChecks) {
        if (!item.value) {
            checks.push({
                name: `${item.name} format`,
                passed: true,
                detail: `Not set (will fallback to ${item.fallback})`,
            });
            continue;
        }

        checks.push({
            name: `${item.name} format`,
            passed: !webhookLooksLikeUrl(item.value),
            detail: webhookLooksLikeUrl(item.value)
                ? 'Invalid: looks like URL, expected signing secret'
                : 'Valid non-URL secret format',
        });
    }

    const usingFallback = !paymentWebhookSecret || !payoutWebhookSecret || !commissionWebhookSecret;
    checks.push({
        name: 'Split webhook secret readiness',
        passed: true,
        detail: usingFallback
            ? 'Using shared fallback for one or more endpoints'
            : 'Endpoint-specific secrets configured for payment/payout/commission',
    });

    return checks;
}

function main(): void {
    const checks = checkRazorpayConfig();
    const failed = checks.filter((c) => !c.passed);

    console.log('Razorpay config preflight');
    console.log('========================');
    for (const c of checks) {
        console.log(`${c.passed ? 'PASS' : 'FAIL'} ${c.name}: ${c.detail}`);
    }

    if (failed.length > 0) {
        process.exitCode = 1;
        return;
    }

    console.log('All Razorpay config checks passed.');
}

main();
