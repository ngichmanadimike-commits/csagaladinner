const url = `https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest`;
const headers = {
    'Authorization': 'Bearer ' + accessToken,
    'Content-Type': 'application/json',
};
const payload = {
    "BusinessShortCode":"174379",
    "Password":"bfb279f9aa9bdbcf158e97dd1a503b6015d86ee693e5364220aedbc89f88f28e",
    "Timestamp":"${timestamp}",
    "TransactionType":"CustomerBuyGoodsOnline",
    "Amount":amount,
    "PartyA":phoneNumber,
    "PartyB":"174379",
    "PhoneNumber":phoneNumber,
    "CallbackURL":callbackURL,
    "AccountReference":accountReference,
    "TransactionDesc":transactionDesc
};

try {
    const response = await axios.post(url, payload, { headers });
    console.log('STK Push Response:', response.data);
} catch (error) {
    console.error('Error during STK Push:', error);
}