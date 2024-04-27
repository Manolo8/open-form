import {createContext} from "react";
import IFieldProvider from "../types/i-field-provider";

export const FieldContext = createContext<IFieldProvider<any>>(null as unknown as any);
