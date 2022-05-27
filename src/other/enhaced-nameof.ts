import { nameof } from 'ts-simple-nameof';

export function enhacedNameof(value: any): string {
    return typeof value === 'string' ? value : nameof(value);
}
