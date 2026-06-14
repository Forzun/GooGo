interface filterProps {
  filters: string[];
  value: string;
}

const COMMANDS = [
  { name: "/help", desc: "show this help" },
  { name: "/clear", desc: "clear conversation" },
  { name: "/model", desc: "show current model" },
  { name: "/pull", desc: "pull ollama model" },
  { name: "/history", desc: "all your history" },
  { name: "/quit", desc: "quit" },
];

export function filterCommand(input: string) {
  if (!input.startsWith("/")) {
    return [];
  }
  return COMMANDS.filter((word) => word.name.startsWith(input));
}

export function commandFilter({ filters, value }: filterProps) {
  const filterWords = filters.filter((word) =>
    word.toLocaleLowerCase().startsWith(value),
  );
  return filterWords;
}
