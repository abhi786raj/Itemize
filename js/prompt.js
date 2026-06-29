export const RECEIPT_PROMPT = `Analyze the receipt image or text provided and extract all order details. Return ONLY valid JSON matching this exact schema — no markdown, no explanation, no code fences:

{
  "order_id": "",
  "platform": "",
  "status": "",
  "order_date": "",
  "currency": "",

  "items": [
    {
      "name": "",
      "quantity": {
        "count": 0,
        "unit": ""
      },
      "price": 0,
      "original_price": 0
    }
  ],

  "pricing": {
    "subtotal": 0,
    "total_amount": 0
  },

  "fees": {
    "delivery_fee": 0,
    "handling_fee": 0,
    "convenience_fee": 0,
    "platform_fee": 0,
    "packaging_fee": 0,
    "surge_fee": 0,
    "small_cart_fee": 0,
    "service_fee": 0,
    "tip": 0,
    "tax": 0,

    "other_fees": [
      {
        "name": "",
        "amount": 0
      }
    ]
  },

  "discounts": {
    "offer_discount": null,
    "coupon_discount": null,
    "wallet_discount": null,
    "promotional_discount": null,

    "other_discounts": []
  },

  "payment": {
    "method": "",
    "status": null
  }
}

Instructions:
- Fill in all fields with values extracted from the receipt.
- Use numeric values for prices and fees (no currency symbols).
- Use null for unknown discount fields.
- Include all items found on the receipt in the items array.
- Ensure the JSON is valid and parseable.`
