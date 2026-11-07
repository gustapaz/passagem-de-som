import {test,expect} from '@playwright/test';

test('duas sessões disputam o mesmo horário e o cancelamento libera a sala',async({browser})=>{
  const contexts = await Promise.all([browser.newContext(),browser.newContext()]);
  try {
    const pages = await Promise.all(contexts.map(context=>context.newPage()));
    const hour = /^Estéreo 12 às 10:00/;
    const find = page => page.getByRole('button',{name:hour});
    await Promise.all(pages.map(async page=>{
      await page.goto('/');
      await find(page).click();
    }));
    const result = await Promise.all(pages.map(async page=>{
      const response = page.waitForResponse(item=>item.url().endsWith('/api/bookings') && item.request().method()==='POST');
      await page.getByRole('button',{name:'Confirmar reserva'}).click();
      return (await response).status();
    }));
    expect([...result].sort()).toEqual([201,409]);
    const winner = pages[result.indexOf(201)];
    const loser = pages[result.indexOf(409)];
    await expect(winner.getByRole('heading',{name:'Reserva confirmada'})).toBeVisible();
    await expect(loser.getByRole('alert')).toContainText('Outra reserva');
    await loser.getByRole('button',{name:'Voltar'}).click();
    await expect(find(loser)).toBeDisabled();
    await winner.reload();
    await winner.getByRole('button',{name:/Minhas reservas/}).click();
    await winner.getByRole('button',{name:'Cancelar reserva'}).click();
    await expect(winner.getByText('Reserva cancelada. O horário voltou à agenda.')).toBeVisible();
    await loser.reload();
    await expect(find(loser)).toBeEnabled();
  } finally {await Promise.all(contexts.map(context=>context.close()));}
});

test('filtros e agenda funcionam em tela móvel e por teclado',async({page})=>{
  await page.setViewportSize({width:360,height:800});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link',{name:'Pular para a agenda'})).toBeFocused();
  await page.getByLabel('Pessoas').selectOption('9');
  await expect(page.getByRole('heading',{name:'Plateia 03'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Estéreo 12'})).toHaveCount(0);
  await page.getByLabel('Duração').selectOption('3');
  await expect(page.getByRole('button',{name:/Plateia 03 às 20:00/})).toBeDisabled();
  await page.getByLabel('Equipamento').selectOption('Teclado');
  await expect(page.getByRole('heading',{name:'Plateia 03'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(360);
});
