import { processBankAccountResponse } from '@/core/application/services/integrations/deepvue.service';

describe('DeepVue Bank Account Response Processing', () => {
  it('returns error when provider returns code 200 but account does not exist', () => {
    const response = processBankAccountResponse({
      code: 200,
      data: {
        account_exists: false,
        message: 'Account not found',
      },
    });

    expect(response.status).toBe('error');
    expect(response.data.accountExists).toBe(false);
    expect(response.data.valid).toBe(false);
  });

  it('returns success when account exists', () => {
    const response = processBankAccountResponse({
      code: 200,
      data: {
        account_exists: true,
        account_number: '1234567890',
        name_at_bank: 'Jane Doe',
        bank_name: 'HDFC Bank',
      },
    });

    expect(response.status).toBe('success');
    expect(response.data.accountExists).toBe(true);
    expect(response.data.valid).toBe(true);
  });
});
