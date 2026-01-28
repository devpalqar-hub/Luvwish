import axios from 'axios';

export class MyFatoorahService {
    private baseUrl = process.env.MYFATOORAH_BASE_URL!;
    private apiKey = process.env.MYFATOORAH_API_KEY!;

    async verifyPayment(paymentId: string) {
        const response = await axios.post(
            `${this.baseUrl}/v2/GetPaymentStatus`,
            { Key: paymentId, KeyType: 'PaymentId' },
            {
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        return response.data;
    }
}
