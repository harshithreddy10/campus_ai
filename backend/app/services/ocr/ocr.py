import os
import subprocess
import tempfile
import uuid

from app.core.config import settings


def run_tesseract_ocr(image_path: str) -> str:
    """Run Tesseract OCR binary on an image and return extracted text."""
    if not os.path.exists(settings.TESSERACT_CMD):
        print(f"Tesseract OCR executable not found at: {settings.TESSERACT_CMD}")
        return ""

    temp_output_base = os.path.join(tempfile.gettempdir(), f"tess_{uuid.uuid4().hex}")

    try:
        # Run Tesseract command line
        # Syntax: tesseract <image_path> <output_base_without_extension>
        cmd = [settings.TESSERACT_CMD, image_path, temp_output_base]

        subprocess.run(cmd, capture_output=True, text=True, check=True)

        # Read generated text file
        output_txt_file = f"{temp_output_base}.txt"
        if os.path.exists(output_txt_file):
            with open(output_txt_file, encoding="utf-8") as f:
                extracted_text = f.read()
            # Clean up
            os.remove(output_txt_file)
            return extracted_text.strip()
        else:
            print("OCR executed but text file was not generated.")
            return ""

    except Exception as e:
        print(f"Error executing Tesseract OCR subprocess: {e}")
        return ""
