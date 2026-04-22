import { useState, useEffect } from "react";
import { FormData } from "../Types/types";

export const useFormValidation = () => {
    const [isFormValid, setIsFormValid] = useState(false);
    const [formValues, setFormValues] = useState<FormData | null>(null);

    useEffect(() => {
        if (formValues) {
            const isValid = Boolean(
                formValues.email &&
                formValues.password &&
                formValues.userName &&
                formValues.phone
            );
            setIsFormValid(isValid);
        } else {
            setIsFormValid(false);
        }
    }, [formValues]);

    return { isFormValid, setFormValues };
};
