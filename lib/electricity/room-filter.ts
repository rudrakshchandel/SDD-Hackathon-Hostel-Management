export function buildHostelRoomFilter(hostelId: string) {
  return {
    status: "ACTIVE" as const,
    floor: { block: { hostelId } }
  };
}
