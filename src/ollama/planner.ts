import { deleteFunction } from "../tools/delete-function";
import { editFunction } from "../tools/edit-function";
import { customTrimmed } from "../tools/read-file";
import { renameFunction } from "../tools/rename-function";
import { replaceBlock } from "../tools/replace-block";
import type { Plan } from "./type";

export async function executePlan(plan: Plan) {
  switch (plan.type) {
    case "ask_user":
      return plan.question;

    case "rename_function":
      await renameFunction(plan.path, plan.old, plan.new);
      return "success";

    case "edit_function":
      return editFunction();

    case "read_file":
      return customTrimmed(plan.path);

    case "delete_function":
      return deleteFunction(plan.path, plan.name);

    case "replaceBlock_function":
      return replaceBlock(plan.content, plan.oldBlock, plan.newBlock);
  }
}
