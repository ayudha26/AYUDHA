import { useState } from "react";
import { FormData } from "../Types/types";

export const usePasswordMatch = () => {
    const [isPasswordMatch, setIsPasswordMatch] = useState(true);

    const checkPasswordMatch = (data: FormData) => {
        setIsPasswordMatch(Boolean(data.password));
    };

    return { isPasswordMatch, checkPasswordMatch };
};
