import Groq from "groq-sdk";
import readline from "node:readline/promises";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";

const expanseDb: Array<Record<string, string | number>> = [];
const incomeDb: Array<Record<string, string | number>> = [];

const groq = new Groq({ apiKey: Bun.env.GROQ_API_KEY });

async function main() {
   try {
      await getGroqChatCompletion();
   } catch (error) {
      console.error(error);
   }
}

export async function getGroqChatCompletion() {
   const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
   });

   const messages: ChatCompletionMessageParam[] = [
      {
         role: "system",
         content: `You are Josh, a personal finance assistant. Your task is to assist user with their expanses, balances and financial goals in BTD (Bangladeshi Taka). You have access to following tools between ###.

         ###
         1. getTotalExpenses({from: YYYY-MM-DD, to:  YYYY-MM-DD}):string // get total expanse for a time period.
         2. addExpanse({name, amount}):string // add new expanse to the db.
         3. addIncome({name, amount}):string // add new income to same db.
         4. getMoneyBalance():string // Get current money balance.
         ###
            `,
      },
   ];

   // user prompt
   while (true) {
      const question = await rl.question("USER: ");
      if (question === "bye") break;

      messages.push({
         role: "user",
         content: question,
      });

      // agent loop
      while (true) {
         const chatCompletion = await groq.chat.completions.create({
            messages,
            model: "llama-3.3-70b-versatile",
            tools: [
               {
                  type: "function",
                  function: {
                     name: "getTotalExpenses",
                     description: "Get total expenses from date to ",
                     parameters: {
                        type: "object",
                        properties: {
                           from: {
                              type: "string",
                              description:
                                 "From date to get the expenses, format: YYYY-MM-DD",
                           },
                           to: {
                              type: "string",
                              description:
                                 "To date to get the expenses, format: YYYY-MM-DD",
                           },
                        },
                     },
                  },
               },
               {
                  type: "function",
                  function: {
                     name: "addExpanse",
                     description:
                        "Add new expanse entry to the expanse database.",
                     parameters: {
                        type: "object",
                        properties: {
                           name: {
                              type: "string",
                              description:
                                 "Name of the expanse. e.g. Bought iPhone 16 Pro Max for 150k BDT (Bangladeshi Taka)",
                           },
                           amount: {
                              type: "number",
                              description: "Amount of the expanse.",
                           },
                        },
                     },
                  },
               },
               {
                  type: "function",
                  function: {
                     name: "addIncome",
                     description: "Add new income to the database",
                     parameters: {
                        type: "object",
                        properties: {
                           name: {
                              type: "string",
                              description:
                                 "Name of the income. e.g. Get salary 10000BDT",
                           },
                           amount: {
                              type: "number",
                              description: "How much your income",
                           },
                        },
                     },
                  },
               },
               {
                  type: "function",
                  function: {
                     name: "getMoneyBalance",
                     description: "Get current balance",
                  },
               },
            ],
         });

         const choice = chatCompletion.choices[0];
         messages.push(choice?.message!);

         if (!choice?.message.tool_calls) {
            console.log(`Assistant: ${choice?.message.content}`);
            break;
         }

         const toolToCall = choice?.message?.tool_calls;

         let result = "";
         for (const tool of toolToCall) {
            const funcName = tool.function.name;
            const args = tool.function.arguments;

            if (funcName === "getTotalExpenses") {
               result = getTotalExpenses(JSON.parse(args));
            } else if (funcName === "addExpanse") {
               result = addExpanse(JSON.parse(args));
            } else if (funcName === "addIncome") {
               result = addIncome(JSON.parse(args));
            } else if (funcName === "getMoneyBalance") {
               result = getMoneyBalance();
            }

            messages.push({
               role: "tool",
               tool_call_id: tool.id,
               content: result,
            });
         }
      }
   }

   rl.close();
}

await main();

function getTotalExpenses({ from, to }: { from: string; to: string }) {
   const expanse = expanseDb.reduce(
      (acc, item) => acc + (typeof item.amount === "number" ? item.amount : 0),
      0
   );

   return expanse + "BDT (Bangladeshi Tk)";
}

function addExpanse({ name, amount }: { name: string; amount: number }) {
   expanseDb.push({ name, amount });

   return `Add expanse added. Amount: Name: ${name} & Amount: ${amount}`;
}

function addIncome({ amount, name }: { name: string; amount: number }) {
   incomeDb.push({ name, amount });
   return `New Income added. Name: ${name} & Amount: ${amount}`;
}

function getMoneyBalance() {
   const income = incomeDb.reduce(
      (acc, item) => acc + (typeof item.amount === "number" ? item.amount : 0),
      0
   );

   const expanse = expanseDb.reduce(
      (acc, item) => acc + (typeof item.amount === "number" ? item.amount : 0),
      0
   );

   return `Total Balance: ${income - expanse}BDT`;
}
