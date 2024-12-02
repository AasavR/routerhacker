import React, { useState } from "react";
import './App.css';
import axios from "axios";
import { ethers } from "ethers";
import erc20_abi from "./contractAbi.json"
function App() {
  const [quoteData, setQuoteData] = useState();
  const [account, setAccount] = useState("Connect Wallet");
  const [sentence, setSentence] = useState("");
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(false)
  const appStyles = {
	color: '#fff',
	minHeight: '100vh',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	alignItems: 'center',
	padding: '20px',
	backdropFilter: 'blur(5px)', 
  };

  const PATH_FINDER_API_URL = "https://k8-testnet-pf.routerchain.dev/api";

  const chainID = {
    amoy: "80002",
    fuji: "43113",
    holesky: "17000",
  };

  const tokenAddress = {
    aftt: {
      amoy: "0xBAD6e1AbE5EbEae8a123ef14AcA7024D3F8c45fb",
      fuji: "0x69dc97bb33e9030533ca2006ab4cef67f4db4125",
      holesky: "0x5c2c6ab36a6e4e160fb9c529e164b7781f7d255f",
    },
  };

  const initialMessages=  [
	{"role": "user", "content": `Extract the sourceToken, sourceChain, desToken, desChain, and amount from the following sentence. Source Chains can be Holesky, Fuji and Amoy . Similary Destion Chains can be Holesky, Fuji and Amoy. Source and Destination Tokens can be AFTT,USDT, USDC 
	Transfer AFTT Token of amount 0.001 from Holesky to Fuji
	Return the results in the following format which is JSON: 
	{
	  "sourceToken": "x",
	  "sourceChain": "a",
	  "desToken":"y",
	  "desChain": "b",
	  "amount": "z"
	}`},
	{"role":"assistant", "content":`
		{
		sourceToken: AFTT 
		sourceChain: Holesky 
		desToken: AFTT 
		desChain: Fuji 
		amount: 0.001`
	},
	{"role":"user", "content":`
		Extract information such as sourceToken, sourceChain, desToken, desChain, and amount from a given sentence.
		If a destination token isn't specified, assume it to be the same as the source token.
		If any chain or token information is missing, leave it blank.

		*Flag System:**
	 - Use a flag system to indicate the status of the information:
	 - indicates incomplete data (missing essential information).
	 -indicates a complete transaction request (transfer) with all necessary details.
	 -indicates a staking action.

	 *Human-Like System Messages:**
   - Provide clear and humble system messages based on the data context:
	 - For a lack of information, specify which fields are missing in a polite manner.
	 - "Initiating the transaction" for a complete transfer.
	 - "Initiating the stake" for a staking action.

	 **Structured JSON Output:**
   - Format responses in structured JSON when summarizing the extracted data and decisions.
		`},
	{"role":"assistant","content":`
		{"sourceToken":"AFTT",
		"sourceChain":"Holesky",
		"desToken":"AFTT",
		"desChain": "Fuji",
		"amount":"0.001",
		"flag":2,
		"systemMessage":"Initiating the stake."}`
		},
		{"role":"user", "content":"one more thing, this is going to be used in chatbot so all reply in json. Add 2 more fields, isTransaction and userReply, If  you think the message is related to transaction or stake send isTransaction=1 and userReply can be this is transaction and single line about transaction otherwise if you think the message is not related to transaction or stake send isTransaction 0 and in userReply jsut normal reply to message "},
		{"role":"assistant", "content":`
			{
				"sourceToken": "AFTT",
				"sourceChain": "Holesky",
				"desToken": "AFTT",
				"desChain": "Fuji",
				"amount": 0.001,
				"flag": 1,
				"systemMessage": "Initiating the transaction.",
				"isTransaction": 1,
				"userReply": "This is a transaction. Initiating a transfer of 0.001 AFTT from Holesky to Fuji."
				}`
			},
			{"role":"user", "content":"keep in mind swap mean stake"},
			{"role":"assistant", "content":`Thank you for clarifying that "swap" should be interpreted as "stake." With this adjusted understanding, here's how the JSON response would look for the sentence "swap AFTT Token of amount 0.001 from Holesky to Fuji":
{
  "sourceToken": "AFTT",
  "sourceChain": "Holesky",
  "desToken": "AFTT",
  "desChain": "Fuji",
  "amount": 0.001,
  "flag": 2,
  "systemMessage": "Initiating the stake.",
  "isTransaction": 1,
  "userReply": "This is a staking operation. Initiating staking of 0.001 AFTT from Holesky to Fuji."
}

In this response:
- **flag:** 2 indicates that the action is related to staking.
- **systemMessage:** confirms the initiation of the stake.
- **isTransaction:** 1 signals it is indeed a transaction (staking) related message.
- **userReply:** gives a concise explanation of the staking operation.

This approach allows the chatbot to handle "swap" as a synonym for "stake" in a consistent manner. Let me know if there's anything else you'd like to modify or explore further!`
},
{"role":"user", "content":`"${sentence}"
	Return the results in the following format: 
	{
	 "sourceToken": "x",
  "sourceChain": "b",
  "desToken": "a",
  "desChain": "r",
  "amount": "j",
  "flag": "f",
  "systemMessage": "i",
  "isTransaction": "v",
  "userReply": "t"
	}`},

]

const extractVariables = async (sentence) => {
    if (!sentence.trim()) return; // Don't process empty inputs

    setLoading(true);
    const newConversation = [
      ...conversation,
      { role: "user", content: sentence }, 
    ];
	setConversation([...newConversation,])
	setSentence(""); 
    try {
      const messages = [...initialMessages, ...newConversation];
      const completion = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: messages,
        },
        {
          headers: {
            Authorization: `Bearer `, 
          },
        }
      );
      const assistantResponse = JSON.parse(completion.data.choices[0].message.content);
	  console.log("here is the data",assistantResponse)
      setConversation([...newConversation, {"role":"assistant", "content":assistantResponse?.userReply || "please continue"}]);
	  console.log("here is the conversation", conversation)
	  return assistantResponse;
    } catch (error) {
      console.error("Error during API call:", error);
    } finally {
      setLoading(false);
    }
  };

  const getQuote = async (params) => {
    const endpoint = "v2/quote";
    const quoteUrl = `${PATH_FINDER_API_URL}/${endpoint}`;
    try {
      const res = await axios.get(quoteUrl, { params });
      setQuoteData(res.data);
      return res.data;
    } catch (e) {
      console.error(`Error fetching quote data: ${e}`);
    }
  };

  const checkAndSetAllowance = async (wallet, tokenAddress, approvalAddress, amount) => {
	if (tokenAddress === ethers.constants.AddressZero) {
	  console.log("Token address is zero; skipping allowance.");
	  return;
	}
  
	const erc20 = new ethers.Contract(tokenAddress, erc20_abi, wallet);
	const currentAllowance = await erc20.allowance(await wallet.getAddress(), approvalAddress);
	console.log(`Current Allowance: ${currentAllowance.toString()}`);
  
	if (currentAllowance.lt(amount)) {
	  console.log(`Insufficient allowance. Approving ${amount.toString()}...`);
	  const approveTx = await erc20.approve(approvalAddress, amount, {
		gasPrice: await wallet.provider.getGasPrice(),
	  });
	  await approveTx.wait();
	  console.log(`Approval transaction mined: ${approveTx.hash}`);
	} else {
	  console.log("Sufficient allowance already exists.");
	}
  };
  

  const getTransaction = async (params, quoteData) => {
    const endpoint = "v2/transaction";
    const txDataUrl = `${PATH_FINDER_API_URL}/${endpoint}`;
    try {
      const res = await axios.post(txDataUrl, {
        ...quoteData,
        slippageTolerance: 0.5,
        senderAddress: account,
        receiverAddress: account,
      });
      return res.data;
    } catch (e) {
      console.error(`Error fetching transaction data: ${e}`);
    }
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);
        console.log(`Connected wallet: ${accounts[0]}`);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleTransaction = async () => {
    const variables = await extractVariables(sentence);
    if (variables && variables.isTransaction===1 && variables.flag!==0) {
      const { sourceToken, sourceChain, desToken, desChain, amount, flag } = variables;
	  flag===1?alert("this is tranaction"):alert("this is stake");
      const resObj = {
        sourceToken: tokenAddress[sourceToken.toLowerCase()][sourceChain.toLowerCase()],
        sourceChain: chainID[sourceChain.toLowerCase()],
        desToken: tokenAddress[desToken.toLowerCase()][desChain.toLowerCase()],
        desChain: chainID[desChain.toLowerCase()],
        amount: ethers.utils.parseUnits(amount.toString(), 18),
      };

      console.log("Resolved Transaction Parameters:", resObj);

      const quote = await getQuote({
        fromTokenAddress: resObj.sourceToken,
        toTokenAddress: resObj.desToken,
        amount: resObj.amount.toString(),
        fromTokenChainId: resObj.sourceChain,
        toTokenChainId: resObj.desChain,
        partnerId: 22,
      });

      console.log("Quote Data:", quote);

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      await checkAndSetAllowance(
        signer,
        resObj.sourceToken,
        quote.allowanceTo,
        ethers.constants.MaxUint256
      );

      const txResponse = await getTransaction(
        {
          fromTokenAddress: resObj.sourceToken,
          toTokenAddress: resObj.desToken,
          fromTokenChainId: resObj.sourceChain,
          toTokenChainId: resObj.desChain,
        },
        quote
      );

      console.log("Transaction Data:", txResponse);

      const tx = await signer.sendTransaction(txResponse.txn);
      await tx.wait();
      console.log(`Transaction successful: ${tx.hash}`);
      alert(`Transaction successful: ${tx.hash}`);
    }
  };

  return (
    <div className="App">
      <button className="button" onClick={connectWallet}>
        {account !== "Connect Wallet"
          ? `${account.substring(0, 4)}...${account.substring(38, 42)}`
          : account}
      </button>

	  <div className="chat-box">
        {conversation.map((msg, index) => (
          <div key={index} className={ msg.role === "user" ? "user" : "assistant"} >
            <span>{msg.content}</span>
          </div>
        ))}
      </div>

	  <div className="chat-input-container">
        <textarea
          className="chat-input"
          rows="3"
		  value={sentence}
          placeholder="Type your message here..."
          onChange={(e) => setSentence(e.target.value)}
        ></textarea>
    	<button onClick={handleTransaction} className="send-button" disabled={loading}>{loading ? "Sending..." : "Send"}</button>
      </div>
	  
	  
      {/* <textarea
        cols="100"
        placeholder="Enter transaction details"
        onChange={(e) => setSentence(e.target.value)}
      ></textarea> */}
    </div>
  );
}

export default App;
