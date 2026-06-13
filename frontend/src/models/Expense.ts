export const ExpenseCategory = {
    Transport: 'Transport',
    Accommodation: 'Accommodation',
    Food: 'Food',
    Tickets: 'Tickets',
    Shopping: 'Shopping',
    Other: 'Other'
} as const;

export type ExpenseCategory = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const ExpenseCategoryLabels: Record<ExpenseCategory, string> = {
    [ExpenseCategory.Transport]: 'Transport',
    [ExpenseCategory.Accommodation]: 'Accommodation',
    [ExpenseCategory.Food]: 'Food',
    [ExpenseCategory.Tickets]: 'Tickets',
    [ExpenseCategory.Shopping]: 'Shopping',
    [ExpenseCategory.Other]: 'Other'
};

export interface Expense {
    id: number;
    travelPlanId: number;
    name: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    description?: string;
}

export interface ExpenseRequestDto {
    name: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    description?: string;
}
