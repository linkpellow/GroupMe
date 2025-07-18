.PHONY: deploy-prod deploy-staging

BRANCH := $(shell git rev-parse --abbrev-ref HEAD)

## Push current branch to staging main
## Prompts for confirmation to avoid accidental deploys

deploy-staging:
	@read -p "Deploy $(BRANCH) to STAGING? (y/N) " confirm; \
	if [ "$$confirm" = "y" ]; then \
		echo "Pushing $(BRANCH) → heroku-staging:main"; \
		git push heroku-staging $(BRANCH):main; \
	else \
		echo "Cancelled"; \
	fi

## Push current branch to production main
## Prompts for confirmation to avoid accidental deploys

deploy-prod:
	@read -p "Deploy $(BRANCH) to PROD? (y/N) " confirm; \
	if [ "$$confirm" = "y" ]; then \
		echo "Pushing $(BRANCH) → heroku-prod:main"; \
		git push heroku-prod $(BRANCH):main; \
	else \
		echo "Cancelled"; \
	fi 