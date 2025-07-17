import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import axiosInstance from "../api/axiosInstance";
import { clearAllAuthData } from "../utils/clearAuthData";
// ... existing code from lines 1-615 copied verbatim from backup ... 