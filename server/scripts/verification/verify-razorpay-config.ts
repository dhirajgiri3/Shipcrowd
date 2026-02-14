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

    const webhookLooksLikeUrl = /^https?:\/\//i.test(webhookSecret);
    checks.push({
        name: 'RAZORPAY_WEBHOOK_SECRET format',
        passed: webhookSecret.length > 0 && !webhookLooksLikeUrl,
        detail:
            webhookSecret.length === 0
                ? 'Missing'
                : webhookLooksLikeUrl
                    ? 'Invalid: looks like URL, expected signing secret'
                    : 'Valid non-URL secret format',
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
