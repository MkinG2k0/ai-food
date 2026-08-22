import { test, expect } from './fixtures/test';



test.describe('meal edit', () => {

  test.beforeEach(async ({ editableMealPage: page }) => {

    await page.getByRole('button', { name: /Бургер с салатом/ }).click();

    await expect(page).toHaveURL(/\/meal\/e2e-edit-meal/);

  });



  test('изменение калорий обновляет totals', async ({ editableMealPage: page }) => {

    const kcalInput = page.getByLabel('Калории блюда');

    await kcalInput.fill('600');

    await kcalInput.blur();

    await expect(kcalInput).toHaveValue('600');

  });



  test('изменение граммовки масштабирует состав', async ({

    editableMealPage: page,

  }) => {

    const gramsInput = page.getByLabel(

      'Граммовка всего блюда (масштабирует граммы состава)',

    );

    await gramsInput.click();

    await gramsInput.fill('700');

    await gramsInput.blur();

    await expect(gramsInput).toHaveValue('700');

  });



  test('порции увеличивают КБЖУ', async ({ editableMealPage: page }) => {

    const kcalBefore = await page.getByLabel('Калории блюда').inputValue();

    await page.getByLabel('Увеличить съеденные порции (меняет КБЖУ)').click();

    const kcalAfter = await page.getByLabel('Калории блюда').inputValue();

    expect(Number(kcalAfter)).toBeGreaterThan(Number(kcalBefore));

  });



  test('исправление числа порций без изменения КБЖУ', async ({

    editableMealPage: page,

  }) => {

    const kcalBefore = await page.getByLabel('Калории блюда').inputValue();

    const portionsInput = page.getByLabel(

      'Исправить число порций без изменения КБЖУ',

    );

    await portionsInput.click();

    await portionsInput.fill('3');

    await portionsInput.blur();

    await expect(page.getByLabel('Калории блюда')).toHaveValue(kcalBefore);

  });



  test('редактирование макросов', async ({ editableMealPage: page }) => {

    await page.getByLabel('Белки блюда').fill('50');

    await page.getByLabel('Углеводы блюда').fill('60');

    await page.getByLabel('Жиры блюда').fill('25');

    await page.getByLabel('Клетчатка блюда').fill('12');

    await expect(page.getByLabel('Белки блюда')).toHaveValue('50');

  });



  test('удаление приёма возвращает на главную', async ({

    editableMealPage: page,

  }) => {

    await page.getByLabel('Удалить приём пищи').click();

    await expect(

      page.getByRole('heading', { name: 'Удалить приём пищи?' }),

    ).toBeVisible();

    await page
      .getByRole('heading', { name: 'Удалить приём пищи?' })
      .locator('..')
      .getByRole('button', { name: 'Удалить', exact: true })
      .click();

    await expect(page).toHaveURL('/');

    await expect(page.getByText('Бургер с салатом')).toHaveCount(0);

  });



  test('редактирование ингредиента: граммы и режим на 100 г', async ({

    editableMealPage: page,

  }) => {

    await page.getByLabel('Редактировать Овсянка').click();

    await expect(page).toHaveURL(/\/item\//);



    const gramsInput = page.getByLabel('Граммы');

    await gramsInput.fill('250');

    await gramsInput.blur();



    await page.getByRole('tab', { name: 'На 100 г' }).click();

    const kcalPer100 = page.getByLabel('Калории на 100 г');

    await expect(kcalPer100).toBeVisible();

    await kcalPer100.fill('150');

    await kcalPer100.blur();



    await page.getByLabel('Назад').click();

    await expect(page).toHaveURL(/\/meal\/e2e-edit-meal/);

  });



  test('удаление ингредиента', async ({ editableMealPage: page }) => {

    await page.getByLabel('Редактировать Овсянка').click();

    await page.getByRole('button', { name: 'Удалить ингредиент' }).click();

    await page
      .getByRole('heading', { name: 'Удалить ингредиент?' })
      .locator('..')
      .getByRole('button', { name: 'Удалить', exact: true })
      .click();

    await expect(page.getByText('Ингредиент удалён')).toBeVisible();
    await expect(page).toHaveURL(/\/meal\/e2e-edit-meal/);

    await expect(page.getByText('Овсянка', { exact: true })).toHaveCount(0);

  });



  test('refine через AI показывает toast обновления', async ({

    editableMealPage: page,

  }) => {

    await page.getByRole('button', { name: 'Изменить', exact: true }).click();

    await expect(

      page.getByRole('heading', { name: 'Уточнить блюдо' }),

    ).toBeVisible();

    await page

      .getByPlaceholder(/съел половину/)

      .fill('съел половину порции');

    await page.getByRole('button', { name: 'Пересчитать' }).click();

    await expect(page.getByText('Приём обновлён')).toBeVisible({

      timeout: 15_000,

    });

  });

});


