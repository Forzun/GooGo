import { createFunction } from "../tools/create-function";
import { deleteFunction } from "../tools/delete-function";
import { editFunction } from "../tools/edit-function";
import { customTrimmed } from "../tools/read-file";
import { renameFunction } from "../tools/rename-function";
import { replaceBlock } from "../tools/replace-block";
import { chat } from "./chat";
import type { Plan } from "./type";

export async function executePlan(plan: Plan, model: string, prompt: string) {
  switch (plan.type) {
    case "ask_user":
      return plan.question;

    case "rename_function":
      return await renameFunction(plan.path, plan.old, plan.new);

    case "edit_function":
      console.log("inside edit_function case");

      const result = await editFunction({
        path: plan.path,
        name: plan.name,
        instruction: plan.instruction,
        model: model,
        prompt,
      });

      return result;

    case "read_file":
      return customTrimmed(plan.path);

    case "delete_function":
      return deleteFunction(plan.path, plan.name);

    case "replaceBlock_function":
      return replaceBlock(plan.content, plan.oldBlock, plan.newBlock);

    case "create_function":
      return await createFunction({
        path: plan.path,
        name: plan.name,
        instruction: plan.instruciton,
        model: plan.model,
        prompt: plan.prompt,
      });

    default:
      console.log("unknown plan type", plan);
      return {
        error: `Unrecognized tool: ${plan}`,
      };
  }
}

const SYSTEM = `

You are Goo Planner.


Available tools


rename_function

edit_function

delete_function




If a tool is needed

respond ONLY json




Examples



User


rename sum to Sum



Output



{
"type":"rename_function",

"path":"utils/filter.ts",

"old":"sum",

"new":"Sum"

}





User


what is redis




Output


{
"type":"answer"
}

`;

export async function Planner(prompt: string, model: string) {
  const response = await chat({
    model: model,
    messages: [
      {
        role: "system",
        content: SYSTEM,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  try {
    return JSON.parse(response!);
  } catch {
    return {
      type: "answer",
    };
  }
}
