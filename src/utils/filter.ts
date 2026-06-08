interface filterProps {
  filters: string[];
  value: string;
}

export function commandFilter({ filters, value }: filterProps) {
  const filterWords = filters.filter((word) =>
    word.toLocaleLowerCase().startsWith(value),
  );
  return filterWords;
}
