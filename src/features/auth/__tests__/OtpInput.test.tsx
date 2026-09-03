import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OtpInput, OTP_LENGTH } from "../OtpInput";

function boxes() {
  return screen.getAllByLabelText(new RegExp(`Dígito \\d de ${OTP_LENGTH}`)) as HTMLInputElement[];
}

describe("OtpInput", () => {
  it(`renders ${OTP_LENGTH} empty boxes for an empty value`, () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = boxes();
    expect(inputs).toHaveLength(OTP_LENGTH);
    inputs.forEach((el) => expect(el.value).toBe(""));
  });

  it("reflects each character of the value in its box", () => {
    render(<OtpInput value="12" onChange={() => {}} />);
    const inputs = boxes();
    expect(inputs[0].value).toBe("1");
    expect(inputs[1].value).toBe("2");
    expect(inputs[2].value).toBe("");
  });

  it("typing a digit calls onChange with it inserted at that position", () => {
    const onChange = vi.fn();
    render(<OtpInput value="1" onChange={onChange} />);
    fireEvent.change(boxes()[1], { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("15");
  });

  it("strips non-numeric characters typed into a box", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    fireEvent.change(boxes()[0], { target: { value: "a" } });
    expect(onChange).toHaveBeenCalledWith("");
  });

  it(`splits a pasted ${OTP_LENGTH}-digit code across all boxes`, () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const full = "1".repeat(OTP_LENGTH - 1) + "9";
    const paste = { clipboardData: { getData: () => full } };
    fireEvent.paste(boxes()[0], paste);
    expect(onChange).toHaveBeenCalledWith(full);
  });

  it("ignores non-numeric characters in pasted content", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const digits = "1".repeat(OTP_LENGTH - 1) + "9";
    const noisy = digits.split("").join("-ab"); // interleave letters/dashes between each digit
    const paste = { clipboardData: { getData: () => noisy } };
    fireEvent.paste(boxes()[0], paste);
    expect(onChange).toHaveBeenCalledWith(digits);
  });
});
