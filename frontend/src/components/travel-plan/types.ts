import type { Expense, ExpenseRequestDto } from '../../models/Expense';
import type {
  Activity,
  ActivityRequestDto,
  ChecklistItem,
  ChecklistItemRequestDto,
  Destination,
  DestinationRequestDto,
} from '../../models/TravelPlan';

export interface TravelPlanActions {
  saveExpense?: (dto: ExpenseRequestDto, expense: Expense | null) => Promise<void>;
  deleteExpense?: (expense: Expense) => Promise<void>;
  saveDestination?: (dto: DestinationRequestDto, destination: Destination | null) => Promise<void>;
  deleteDestination?: (destination: Destination) => Promise<void>;
  saveActivity?: (dto: ActivityRequestDto, activity: Activity | null) => Promise<void>;
  deleteActivity?: (activity: Activity) => Promise<void>;
  saveChecklistItem?: (dto: ChecklistItemRequestDto, item: ChecklistItem | null) => Promise<void>;
  toggleChecklistItem?: (item: ChecklistItem) => Promise<void>;
  deleteChecklistItem?: (item: ChecklistItem) => Promise<void>;
}
