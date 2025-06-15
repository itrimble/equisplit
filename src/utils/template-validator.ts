/**
 * Template File Validation Utilities
 * 
 * Provides functions to validate the existence and integrity of template files
 * required for document generation, ensuring graceful error handling when
 * templates are missing or corrupted.
 */

export interface TemplateValidationResult {
  exists: boolean;
  accessible: boolean;
  error?: string;
  size?: number;
}

export interface TemplateConfig {
  name: string;
  path: string;
  required: boolean;
  description: string;
}

// Template configuration registry
export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  msa: {
    name: 'MSA Template',
    path: '/templates/msa_template.docx',
    required: true,
    description: 'Marital Settlement Agreement template for DOCX generation'
  }
  // Add more templates here as needed
  // financialAffidavit: {
  //   name: 'Financial Affidavit Template',
  //   path: '/templates/financial_affidavit_template.docx',
  //   required: false,
  //   description: 'Financial affidavit template for court filings'
  // }
};

/**
 * Validates the existence and accessibility of a template file
 * @param templatePath - Path to the template file (relative to public folder)
 * @returns Promise with validation result
 */
export async function validateTemplateFile(templatePath: string): Promise<TemplateValidationResult> {
  try {
    const response = await fetch(templatePath, { 
      method: 'HEAD', // Only check if file exists, don't download content
      cache: 'no-cache' // Ensure we get fresh status
    });

    if (!response.ok) {
      return {
        exists: false,
        accessible: false,
        error: `Template file not found: ${response.status} ${response.statusText}`
      };
    }

    const contentLength = response.headers.get('content-length');
    const size = contentLength ? parseInt(contentLength, 10) : undefined;

    // Basic file size validation (DOCX files should be at least 1KB)
    if (size !== undefined && size < 1024) {
      return {
        exists: true,
        accessible: false,
        error: 'Template file appears to be corrupted or empty (size < 1KB)',
        size
      };
    }

    return {
      exists: true,
      accessible: true,
      size
    };

  } catch (error) {
    return {
      exists: false,
      accessible: false,
      error: `Failed to validate template: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Validates all registered templates
 * @returns Promise with validation results for all templates
 */
export async function validateAllTemplates(): Promise<Record<string, TemplateValidationResult>> {
  const results: Record<string, TemplateValidationResult> = {};
  
  for (const [key, config] of Object.entries(TEMPLATE_REGISTRY)) {
    results[key] = await validateTemplateFile(config.path);
  }
  
  return results;
}

/**
 * Gets missing required templates
 * @returns Promise with array of missing required template configurations
 */
export async function getMissingRequiredTemplates(): Promise<TemplateConfig[]> {
  const results = await validateAllTemplates();
  const missing: TemplateConfig[] = [];
  
  for (const [key, config] of Object.entries(TEMPLATE_REGISTRY)) {
    if (config.required && (!results[key]?.exists || !results[key]?.accessible)) {
      missing.push(config);
    }
  }
  
  return missing;
}

/**
 * Generates a user-friendly error message for template validation failures
 * @param templateKey - Key of the template from TEMPLATE_REGISTRY
 * @param validationResult - Result from validateTemplateFile
 * @returns User-friendly error message
 */
export function getTemplateErrorMessage(templateKey: string, validationResult: TemplateValidationResult): string {
  const config = TEMPLATE_REGISTRY[templateKey];
  if (!config) {
    return 'Unknown template error occurred.';
  }

  if (!validationResult.exists) {
    return `The ${config.name} file is missing from the server. Please contact support or try again later.`;
  }

  if (!validationResult.accessible) {
    return `The ${config.name} file exists but appears to be corrupted. Please contact support.`;
  }

  return `An error occurred while accessing the ${config.name}: ${validationResult.error || 'Unknown error'}`;
}

/**
 * Client-side template validation hook for React components
 * @param templateKey - Key of the template to validate
 * @returns Object with validation state and functions
 */
export function useTemplateValidation(templateKey: string) {
  const [isValidating, setIsValidating] = React.useState(false);
  const [validationResult, setValidationResult] = React.useState<TemplateValidationResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const validateTemplate = React.useCallback(async () => {
    const config = TEMPLATE_REGISTRY[templateKey];
    if (!config) {
      setError('Invalid template configuration');
      return false;
    }

    setIsValidating(true);
    setError(null);

    try {
      const result = await validateTemplateFile(config.path);
      setValidationResult(result);

      if (!result.exists || !result.accessible) {
        setError(getTemplateErrorMessage(templateKey, result));
        return false;
      }

      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown validation error';
      setError(errorMsg);
      return false;
    } finally {
      setIsValidating(false);
    }
  }, [templateKey]);

  React.useEffect(() => {
    validateTemplate();
  }, [validateTemplate]);

  return {
    isValidating,
    validationResult,
    error,
    isValid: validationResult?.exists && validationResult?.accessible,
    validateTemplate
  };
}

// React import for the hook
import React from 'react';