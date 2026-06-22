import type { PublicationTemplate } from '../types';
import { ALL_TEMPLATES } from '../templates';

export class TemplateRegistry {
  /**
   * Retrieves a template by its unique identifier.
   */
  public static getTemplate(templateId: string): PublicationTemplate {
    const template = ALL_TEMPLATES.find((t) => t.id === templateId);
    if (!template) {
      throw new Error(`Template with ID "${templateId}" not found in the registry.`);
    }
    return template;
  }

  /**
   * Lists all statically registered publishing templates.
   */
  public static listTemplates(): readonly PublicationTemplate[] {
    return ALL_TEMPLATES;
  }
}
