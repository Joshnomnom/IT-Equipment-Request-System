export type EquipmentStatus = "ACTIVE" | "INACTIVE";

export interface Equipment {
  id: number;
  name: string;
  category: string;
  stockQuantity: number;
  status: EquipmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentInput {
  name: string;
  category: string;
  stockQuantity: number;
  status: EquipmentStatus;
}
